# Marketing frames for the App Store 6.9" set (owner 2026-10-25: "make it look
# professional like all the brands do"): a headline and one line on the brand
# background, the real app screen in a phone, bleeding off the bottom.
# Renders each slide with headless Chrome at 1320x2868. No Stripe in any copy.
import subprocess, pathlib, html, sys
HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent.parent / 'screenshots-1.03'
OUT = HERE.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PLUM = 'radial-gradient(120% 60% at 50% 100%, #FF7733 0%, rgba(255,119,51,0) 55%), linear-gradient(180deg, #1A0F2E 0%, #3A1D5C 100%)'
SUN = 'linear-gradient(160deg, #F93C1F 0%, #FF7733 52%, #FFB83D 100%)'
SLIDES = [
  ('01-welcome.png', 'Data for|every trip', 'Your eSIM is ready in minutes.', PLUM),
  ('02-store.png', 'Pick where|you’re going', 'A country, a region or the whole world.', SUN),
  ('03-global.png', 'One plan for|the whole world', 'Unlimited data, one monthly price.', PLUM),
  ('04-japan-data.png', 'Just the data|you need', 'Clear prices. No roaming bills.', SUN),
  ('05-japan-unlimited.png', 'Unlimited,|never cut off', 'Full speed every day of your trip.', PLUM),
  ('06-rewards.png', 'Rewards as|you travel', 'Levels, badges and credit back.', SUN),
]
PAGE = '''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:1320px;height:2868px;overflow:hidden}}
body{{background:{bg};font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;color:#fff;position:relative}}
.copy{{position:absolute;top:190px;left:90px;right:90px;text-align:center}}
h1{{margin:0;font-size:116px;line-height:1.04;font-weight:800;letter-spacing:-2.5px;text-shadow:0 4px 24px rgba(26,15,46,.18)}}
p{{margin:34px 0 0;font-size:54px;line-height:1.25;font-weight:500;opacity:.92}}
.phone{{position:absolute;left:50%;top:{top}px;width:1060px;transform:translateX(-50%);border-radius:150px;padding:26px;background:#0E0A14;
  box-shadow:0 0 0 6px #2A2433, 0 60px 120px rgba(26,15,46,.45)}}
.phone img{{display:block;width:100%;border-radius:126px}}
</style></head><body><div class="copy"><h1>{h}</h1><p>{s}</p></div>
<div class="phone"><img src="{img}"></div></body></html>'''
# The review account's address on the Rewards card is painted out (white, the card's own colour).
from PIL import Image, ImageDraw
MASKS = {'06-rewards.png': [(100, 1350, 640, 1418)]}
for name, h, s, bg in SLIDES:
    img = SRC / name
    if name in MASKS:
        im = Image.open(img).convert('RGB')
        for box in MASKS[name]:
            ImageDraw.Draw(im).rectangle(box, fill=(255, 255, 255))
        img = HERE / ('_' + name)
        im.save(img)
    top = 720
    page = HERE / ('_' + name.replace('.png', '.html'))
    page.write_text(PAGE.format(bg=bg, h=html.escape(h).replace('|', '<br>'), s=html.escape(s), img=img.as_uri(), top=top))
    out = OUT / name
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--window-size=1320,2868', f'--screenshot={out}', '--allow-file-access-from-files', page.as_uri()],
                   check=True, capture_output=True)
    print(out)
