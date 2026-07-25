// Distinct 3D landmark + nature icons for the globe. Source: Microsoft Fluent
// Emoji 3D set — MIT licensed, free for commercial use (see
// LICENSE-3D-ICONS.txt). One unique item per place — no icon is reused.
import ferriswheel from './ferriswheel.png'; // 🎡 London Eye
import classical from './classical.png'; // 🏛️ Rome (Colosseum/Pantheon)
import mosque from './mosque.png'; // 🕌 Istanbul
import cityscape from './cityscape.png'; // 🏙️ Dubai
import temple from './temple.png'; // 🛕 Mumbai
import tokyotower from './tokyotower.png'; // 🗼 Tokyo
import torii from './torii.png'; // ⛩️ (kept for reuse; not on the globe)
import bridge from './bridge.png'; // 🌉 Golden Gate, San Francisco
import mountain from './mountain.png'; // ⛰️ Sugarloaf, Rio
import liberty from './liberty.png'; // 🗽 New York
import snowmountain from './snowmountain.png'; // 🏔️ Everest / Himalayas
import fuji from './fuji.png'; // 🗻 Mount Fuji
import volcano from './volcano.png'; // 🌋 Merapi, Indonesia
import cactus from './cactus.png'; // 🌵 Mexico
import palmtree from './palmtree.png'; // 🌴 Caribbean
import camel from './camel.png'; // 🐪 Sahara
import kangaroo from './kangaroo.png'; // 🦘 Australian outback
import sailboat from './sailboat.png'; // ⛵ Sydney Harbour
import moai from './moai.png'; // 🗿 Easter Island
import elephant from './elephant.png'; // 🐘 Kenya
import panda from './panda.png'; // 🐼 Sichuan, China
import tiger from './tiger.png'; // 🐅 India
import lion from './lion.png'; // 🦁 southern-Africa savanna
import penguin from './penguin.png'; // 🐧 Antarctica
import polarbear from './polarbear.png'; // 🐻‍❄️ Greenland
import whale from './whale.png'; // 🐳 South Pacific
import dolphin from './dolphin.png'; // 🐬 Atlantic
import monkey from './monkey.png'; // 🐒 Amazon
import beach from './beach.png'; // 🏖️ Maldives palm beach
import ship from './ship.png'; // 🚢 North Atlantic
import octopus from './octopus.png'; // 🐙 north-west Pacific
import shark from './shark.png'; // 🦈 central Pacific
import tropicalfish from './tropicalfish.png'; // 🐠 Coral Sea
import castle from './castle.png'; // 🏰 Bavaria (Neuschwanstein)
import rocket from './rocket.png'; // 🚀 Cape Canaveral
import slotmachine from './slotmachine.png'; // 🎰 Las Vegas
import stadium from './stadium.png'; // 🏟️ Barcelona (Camp Nou)
import desertisland from './desertisland.png'; // 🏝️ South Pacific
import snowman from './snowman.png'; // ⛄ Siberian winter
import evergreen from './evergreen.png'; // 🌲 Canadian boreal forest
import tent from './tent.png'; // ⛺ Patagonia camping
import crab from './crab.png'; // 🦀 Bering Sea
import butterfly from './butterfly.png'; // 🦋 Brazilian highlands
import horse from './horse.png'; // 🐎 Mongolian steppe
import wolf from './wolf.png'; // 🐺 Russian forest
import bear from './bear.png'; // 🐻 Hudson Bay woods
import eagle from './eagle.png'; // 🦅 Great Plains, USA
import flamingo from './flamingo.png'; // 🦩 Argentine pampas
import gorilla from './gorilla.png'; // 🦍 Congo jungle
import parrot from './parrot.png'; // 🦜 Amazon jungle
import dragon from './dragon.png'; // 🐉 eastern China
import kaaba from './kaaba.png'; // 🕋 Mecca
import drum from './drum.png'; // 🥁 Lagos, Nigeria
import peacock from './peacock.png'; // 🦚 Rajasthan, India
import llama from './llama.png'; // 🦙 Machu Picchu, Peru
import mapleleaf from './mapleleaf.png'; // 🍁 Canada
import tulip from './tulip.png'; // 🌷 Netherlands
import shamrock from './shamrock.png'; // ☘️ Ireland
import koala from './koala.png'; // 🐨 Queensland, Australia
import sloth from './sloth.png'; // 🦥 Costa Rica
import church from './church.png'; // ⛪ Moscow
import bison from './bison.png'; // 🦬 Yellowstone, USA
import deer from './deer.png'; // 🦌 Scottish Highlands
import sunflower from './sunflower.png'; // 🌻 Ukraine
import giraffe from './giraffe.png'; // 🦒 Etosha, Namibia
import crocodile from './crocodile.png'; // 🐊 the Upper Nile
import ewe from './ewe.png'; // 🐑 New Zealand
import orangutan from './orangutan.png'; // 🦧 Borneo
import synagogue from './synagogue.png'; // 🕍 Jerusalem
import japanesecastle from './japanesecastle.png'; // 🏯 Osaka
import nationalpark from './nationalpark.png'; // 🏞️ Grand Canyon
import moose from './moose.png'; // 🫎 Alaska

export const LANDMARK_SRC: Record<string, string> = {
  ferriswheel, classical, mosque, cityscape, temple, tokyotower, torii, bridge,
  mountain, liberty, snowmountain, fuji, volcano, cactus, palmtree, camel,
  kangaroo, sailboat, moai, elephant, panda, tiger, lion, penguin, polarbear,
  whale, dolphin, monkey, beach, ship, octopus, shark, tropicalfish, castle,
  rocket, slotmachine, stadium, desertisland, snowman, evergreen, tent, crab,
  butterfly, horse, wolf, bear, eagle, flamingo, gorilla, parrot, dragon,
  kaaba, drum, peacock, llama, mapleleaf, tulip, shamrock, koala, sloth,
  church, bison, deer, sunflower, giraffe, crocodile, ewe, orangutan,
  synagogue, japanesecastle, nationalpark, moose,
};
