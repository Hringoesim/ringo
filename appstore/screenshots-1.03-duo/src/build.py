# Marketing frames for the App Store iPhone Duo set (APP_IPHONE_DUO, inner
# display 2007 x 2853, owner 2026-10-25: "screenshots for the iPhone Duo").
# Same ten keyword headlines as the 6.9" set (../../screenshots-1.03-marketing),
# so the search words match; the screens are the app's wide two-column layout,
# shot from the web build at 669 x 951 pt @3x (shoot.mjs + plan.json, sample
# member data, no email address, no payment provider named). A status bar is
# drawn on. Renders with headless Chrome.
import subprocess, pathlib, html
HERE = pathlib.Path(__file__).resolve().parent
SCR = HERE / 'screens'
OUT = HERE.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PLUM = 'radial-gradient(120% 60% at 50% 100%, #FF7733 0%, rgba(255,119,51,0) 55%), linear-gradient(180deg, #1A0F2E 0%, #3A1D5C 100%)'
SUN = 'linear-gradient(160deg, #F93C1F 0%, #FF7733 52%, #FFB83D 100%)'
W, H = 2007, 2853
SLIDES = [
  ('01-travel-esim.png', 'welcome.png', 'Travel eSIM for|190+ countries', 'Data for every trip, ready in minutes.', PLUM, 'light'),
  ('02-cheap-data.png', 'store.png', 'Cheap data eSIM|for every trip', 'Search any country, city or region.', SUN, 'dark'),
  ('03-unlimited-global.png', 'global.png', 'Unlimited data|around the world', 'One global eSIM, one monthly price.', PLUM, 'dark'),
  ('04-europe.png', 'europe.png', 'One eSIM for|all of Europe', '33 countries, hotspot included.', SUN, 'dark'),
  ('05-never-cut-off.png', 'japan-unlimited.png', 'Unlimited data,|never cut off', 'Full speed every day of your trip.', PLUM, 'dark'),
  ('06-no-roaming.png', 'japan-data.png', 'No roaming fees,|clear prices', 'Pick the days and the data you need.', SUN, 'dark'),
  ('07-install.png', 'help.png', 'Set up your eSIM|in minutes', 'A step by step guide and real people to help.', PLUM, 'dark'),
  ('08-rewards.png', 'rewards-top.png', 'Rewards as|you travel', 'Levels, avatars and credit back.', SUN, 'dark'),
  ('09-badges.png', 'rewards-badges.png', 'Collect badges|on every trip', '14 badges to earn as you travel.', PLUM, 'dark'),
  ('10-share.png', 'share.png', 'Where you have|been, on a map', 'Every trip on your own travel map.', SUN, 'dark'),
]
BARS = '<svg width="150" height="40" viewBox="0 0 150 40"><g fill="{c}"><rect x="0" y="26" width="10" height="12" rx="2"/><rect x="15" y="19" width="10" height="19" rx="2"/><rect x="30" y="11" width="10" height="27" rx="2"/><rect x="45" y="3" width="10" height="35" rx="2"/><path d="M90 36l-6-6a9 9 0 0112 0zM78 24a17 17 0 0124 0l-4 4a11 11 0 00-16 0zM72 18a25 25 0 0136 0l-4 4a19 19 0 00-28 0z"/><rect x="116" y="8" width="30" height="24" rx="6" fill="none" stroke="{c}" stroke-width="3"/><rect x="120" y="12" width="20" height="16" rx="3"/></g></svg>'
PAGE = '''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:{W}px;height:{H}px;overflow:hidden}}
body{{background:{bg};font-family:-apple-system,'SF Pro Display',system-ui,sans-serif;color:#fff;position:relative}}
.copy{{position:absolute;top:170px;left:120px;right:120px;text-align:center}}
h1{{margin:0;font-size:150px;line-height:1.03;font-weight:800;letter-spacing:-3px;text-shadow:0 4px 24px rgba(26,15,46,.18)}}
p{{margin:40px 0 0;font-size:70px;line-height:1.25;font-weight:500;opacity:.92}}
.dev{{position:absolute;left:50%;top:860px;width:1620px;transform:translateX(-50%);border-radius:110px;padding:30px;background:#0E0A14;
  box-shadow:0 0 0 7px #2A2433, 0 70px 140px rgba(26,15,46,.45)}}
.scr{{position:relative;border-radius:84px;overflow:hidden}}
.scr img{{display:block;width:100%}}
.bar{{position:absolute;top:0;left:0;right:0;height:84px;display:flex;align-items:center;justify-content:space-between;padding:0 80px;
  font:600 44px -apple-system,'SF Pro Text',system-ui,sans-serif;color:{fg}}}
.hinge{{position:absolute;top:0;bottom:0;left:50%;width:2px;background:rgba(0,0,0,.05)}}
</style></head><body><div class="copy"><h1>{h}</h1><p>{s}</p></div>
<div class="dev"><div class="scr"><img src="{img}"><div class="hinge"></div><div class="bar"><span>9:41</span>{bars}</div></div></div></body></html>'''
for name, src, h, s, bg, bar in SLIDES:
    fg = '#FFFFFF' if bar == 'light' else '#1A0F2E'
    page = HERE / ('_' + name.replace('.png', '.html'))
    page.write_text(PAGE.format(W=W, H=H, bg=bg, fg=fg, bars=BARS.format(c=fg), h=html.escape(h).replace('|', '<br>'), s=html.escape(s), img=(SCR / src).as_uri()))
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    f'--window-size={W},{H}', f'--screenshot={OUT / name}', '--allow-file-access-from-files', page.as_uri()],
                   check=False, capture_output=True)
    assert (OUT / name).exists(), name
    print(name)
for f in HERE.glob('_*'):
    f.unlink()
