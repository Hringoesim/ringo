# Marketing frames for the App Store 6.9" set (owner 2026-10-25: "make it look
# professional like all the brands do", then "more than 6 and optimise for
# ASO"): ten slides, each a keyword headline and one line on the brand
# background, the real app screen in a phone bleeding off the bottom. Apple
# reads screenshot text, so the headlines carry the search words (travel
# eSIM, cheap data, unlimited, Europe, no roaming fees, install).
#
# Screens: the simulator shots in ../../screenshots-1.03 (status bar
# included) and web-build shots in screens/ (1320x2868, sample member data,
# no status bar: the simulator's is copied on, dark or white). No Stripe and
# no email address on any slide. Renders with headless Chrome.
import subprocess, pathlib, html
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parent
SIM = HERE.parent.parent / 'screenshots-1.03'
WEB = HERE / 'screens'
OUT = HERE.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PLUM = 'radial-gradient(120% 60% at 50% 100%, #FF7733 0%, rgba(255,119,51,0) 55%), linear-gradient(180deg, #1A0F2E 0%, #3A1D5C 100%)'
SUN = 'linear-gradient(160deg, #F93C1F 0%, #FF7733 52%, #FFB83D 100%)'
CREAM = (255, 250, 247)
# (out, source, headline, line, background, status bar for web shots, cream fill above this y)
SLIDES = [
  ('01-travel-esim.png', SIM / '01-welcome.png', 'Travel eSIM for|190+ countries', 'Data for every trip, ready in minutes.', PLUM, None, 0),
  ('02-cheap-data.png', SIM / '02-store.png', 'Cheap data eSIM|for every trip', 'Search any country or region.', SUN, None, 0),
  ('03-unlimited-global.png', SIM / '03-global.png', 'Unlimited data|around the world', 'One global eSIM, one monthly price.', PLUM, None, 0),
  ('04-europe.png', WEB / 'europe.png', 'One eSIM for|all of Europe', '33 countries, hotspot included.', SUN, 'light', 0),
  ('05-never-cut-off.png', SIM / '05-japan-unlimited.png', 'Unlimited data,|never cut off', 'Full speed every day of your trip.', PLUM, None, 0),
  ('06-no-roaming.png', SIM / '04-japan-data.png', 'No roaming fees,|clear prices', 'Pick the days and the data you need.', SUN, None, 0),
  ('07-install.png', WEB / 'help.png', 'Set up your eSIM|in minutes', 'A step by step guide and real people to help.', PLUM, 'dark', 0),
  ('08-rewards.png', WEB / 'rewards-top.png', 'Rewards as|you travel', 'Levels, avatars and credit back.', SUN, 'dark', 0),
  ('09-badges.png', WEB / 'rewards-badges.png', 'Collect badges|on every trip', '14 badges to earn as you travel.', PLUM, 'dark', 430),
  ('10-share.png', WEB / 'share.png', 'Share Ringo,|get €10 credit', 'For every 3 friends who buy a plan.', SUN, 'dark', 400),
]
# The simulator's status bar (09:41, signal, wifi, battery, the island) as a mask.
BAR = Image.open(SIM / '02-store.png').convert('RGB').crop((0, 0, 1320, 160))
ISLAND = (460, 30, 860, 160)
def with_bar(src, style, fill_to):
    im = Image.open(src).convert('RGB')
    d = ImageDraw.Draw(im)
    if fill_to:
        d.rectangle((0, 0, im.width, fill_to), fill=CREAM)
    px, bar = im.load(), BAR.load()
    for y in range(160):
        for x in range(1320):
            r, g, b = bar[x, y]
            if r + g + b > 600:
                continue  # the cream behind the glyphs
            inside = ISLAND[0] <= x <= ISLAND[2] and ISLAND[1] <= y <= ISLAND[3]
            px[x, y] = (0, 0, 0) if inside else (bar[x, y] if style == 'dark' else (255, 255, 255))
    return im
PAGE = '''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:1320px;height:2868px;overflow:hidden}}
body{{background:{bg};font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;color:#fff;position:relative}}
.copy{{position:absolute;top:190px;left:80px;right:80px;text-align:center}}
h1{{margin:0;font-size:116px;line-height:1.04;font-weight:800;letter-spacing:-2.5px;text-shadow:0 4px 24px rgba(26,15,46,.18)}}
p{{margin:34px 0 0;font-size:54px;line-height:1.25;font-weight:500;opacity:.92}}
.phone{{position:absolute;left:50%;top:720px;width:1060px;transform:translateX(-50%);border-radius:150px;padding:26px;background:#0E0A14;
  box-shadow:0 0 0 6px #2A2433, 0 60px 120px rgba(26,15,46,.45)}}
.phone img{{display:block;width:100%;border-radius:126px}}
</style></head><body><div class="copy"><h1>{h}</h1><p>{s}</p></div>
<div class="phone"><img src="{img}"></div></body></html>'''
for name, src, h, s, bg, bar, fill_to in SLIDES:
    img = src
    if bar:
        img = HERE / ('_' + name)
        with_bar(src, bar, fill_to).save(img)
    page = HERE / ('_' + name.replace('.png', '.html'))
    page.write_text(PAGE.format(bg=bg, h=html.escape(h).replace('|', '<br>'), s=html.escape(s), img=img.as_uri()))
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    '--window-size=1320,2868', f'--screenshot={OUT / name}', '--allow-file-access-from-files', page.as_uri()],
                   check=True, capture_output=True)
    print(name)
for f in HERE.glob('_*'):
    f.unlink()
