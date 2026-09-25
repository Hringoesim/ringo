// pictureCredits.ts — the author and licence of every destination
// photograph the app shows. PICTURE_CREDITS is generated from the website's
// src/data/dataEsimImages.json (the credits behind ringoesim.com/terms), one
// entry per picture served from ringoesim.com/img/data-esims/<id>.jpg, so the
// app credits exactly what it loads. A composite (Europe) credits each part.
// BUNDLED_PICTURE_CREDITS covers the offline stand-ins in public/img/
// destinations that are a different photograph from the website's.
// Shown under Help so the CC BY attributions travel with the pictures.
export interface PictureCredit { title: string; artist: string; license: string; source: string; parts?: PictureCredit[] }
export const PICTURE_CREDITS: Record<string, PictureCredit> = {
  "afghanistan": {
    "title": "Lake in Band-e Amir National Park, March 2008.jpg",
    "artist": "Afghanistan Matters",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Lake_in_Band-e_Amir_National_Park%2C_March_2008.jpg"
  },
  "albania": {
    "title": "House in Berat - Albania.jpg",
    "artist": "Jocelyn Erskine-Kellie",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:House_in_Berat_-_Albania.jpg"
  },
  "algeria": {
    "title": "Algiers, sea front.jpg",
    "artist": "toufik Lerari from Nice, France",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Algiers%2C_sea_front.jpg"
  },
  "andorra": {
    "title": "Andorra la Vella - view2.jpg",
    "artist": "Tiia Monto",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Andorra_la_Vella_-_view2.jpg"
  },
  "anguilla": {
    "title": "Anguilla Shoal Bay is the BEST beach in the Caribbean. - panoramio.jpg",
    "artist": "onj",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Anguilla_Shoal_Bay_is_the_BEST_beach_in_the_Caribbean._-_panoramio.jpg"
  },
  "antigua-and-barbuda": {
    "title": "Antigua Shirley's Heights English Harbour.jpg",
    "artist": "Dr",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Antigua_Shirley%27s_Heights_English_Harbour.jpg"
  },
  "argentina": {
    "title": "Perito Moreno Glacier Patagonia Argentina Luca Galuzzi 2005.JPG",
    "artist": "Luca Galuzzi",
    "license": "CC BY-SA 2.5",
    "source": "https://commons.wikimedia.org/wiki/File:Perito_Moreno_Glacier_Patagonia_Argentina_Luca_Galuzzi_2005.JPG"
  },
  "armenia": {
    "title": "Mount Ararat and the Yerevan skyline.jpg",
    "artist": "Սէրուժ Ուրիշեան",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Mount_Ararat_and_the_Yerevan_skyline.jpg"
  },
  "aruba": {
    "title": "Mangrove tree (Conocarpus erectus) at Eagle Beach, Aruba 2019.jpg",
    "artist": "SIryn",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Mangrove_tree_%28Conocarpus_erectus%29_at_Eagle_Beach%2C_Aruba_2019.jpg"
  },
  "asia": {
    "title": "Skylines of the Central Business District at night in Singapore.jpg",
    "artist": "Basile Morin",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Skylines_of_the_Central_Business_District_at_night_in_Singapore.jpg"
  },
  "australia": {
    "title": "Sydney Opera House and Harbour Bridge, southeast view 20230224 1.jpg",
    "artist": "DXR",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sydney_Opera_House_and_Harbour_Bridge,_southeast_view_20230224_1.jpg"
  },
  "austria": {
    "title": "Panoramic view of Hallstatt village and shoreline from lake.jpg",
    "artist": "David Kernan",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Panoramic_view_of_Hallstatt_village_and_shoreline_from_lake.jpg"
  },
  "azerbaijan": {
    "title": "Baku, Azerbaiyán, 2016-09-26, DD 211.jpg",
    "artist": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Baku%2C_Azerbaiy%C3%A1n%2C_2016-09-26%2C_DD_211.jpg"
  },
  "bahamas": {
    "title": "Nassau Harbour Lighthouse, near Nassau Cruise Port, Bahamas (March 14, 2024) 02.jpg",
    "artist": "Kiran891",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Nassau_Harbour_Lighthouse%2C_near_Nassau_Cruise_Port%2C_Bahamas_%28March_14%2C_2024%29_02.jpg"
  },
  "bahrain": {
    "title": "Manama Qal'at al-Bahrain Courtyard & Skyline 1.jpg",
    "artist": "Zairon",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Manama_Qal%27at_al-Bahrain_Courtyard_%26_Skyline_1.jpg"
  },
  "bangladesh": {
    "title": "Lalbagh Fort North-East Gate.jpg",
    "artist": "Tausheef Hassan Auntu",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Lalbagh_Fort_North-East_Gate.jpg"
  },
  "barbados": {
    "title": "Bathsheba, Barbados 36.jpg",
    "artist": "Postdlf",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bathsheba%2C_Barbados_36.jpg"
  },
  "belarus": {
    "title": "Комплекс Мирского замка.JPG",
    "artist": "Вадзім Новикаў",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:%D0%9A%D0%BE%D0%BC%D0%BF%D0%BB%D0%B5%D0%BA%D1%81_%D0%9C%D0%B8%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B7%D0%B0%D0%BC%D0%BA%D0%B0.JPG"
  },
  "belgium": {
    "title": "Rozenhoedkaai (canal) and Belfry of Bruges, Bruges, Belgium (Ank Kumar, Infosys Limited) 09.jpg",
    "artist": "Ank Kumar",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Rozenhoedkaai_%28canal%29_and_Belfry_of_Bruges%2C_Bruges%2C_Belgium_%28Ank_Kumar%2C_Infosys_Limited%29_09.jpg"
  },
  "belize": {
    "title": "Waterfront in Caye Caulker, Belize.jpg",
    "artist": "James Willamor",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Waterfront_in_Caye_Caulker%2C_Belize.jpg"
  },
  "benin": {
    "title": "Pirogue à voile ou pirogue à balancier de type béninois sur le fleuve de Ganvié 05.jpg",
    "artist": "Adoscam",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Pirogue_%C3%A0_voile_ou_pirogue_%C3%A0_balancier_de_type_b%C3%A9ninois_sur_le_fleuve_de_Ganvi%C3%A9_05.jpg"
  },
  "bolivia": {
    "title": "Piles of Salt Salar de Uyuni Bolivia Luca Galuzzi 2006 a.jpg",
    "artist": "Luca Galuzzi",
    "license": "CC BY-SA 2.5",
    "source": "https://commons.wikimedia.org/wiki/File:Piles_of_Salt_Salar_de_Uyuni_Bolivia_Luca_Galuzzi_2006_a.jpg"
  },
  "bosnia-and-herzegovina": {
    "title": "Mostar Old Town Panorama 2007.jpg",
    "artist": "Ramirez",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Mostar_Old_Town_Panorama_2007.jpg"
  },
  "botswana": {
    "title": "Cebras de Burchell (Equus quagga burchellii), vista aérea del delta del Okavango, Botsuana, 2018-08-01, DD 30.jpg",
    "artist": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cebras_de_Burchell_%28Equus_quagga_burchellii%29%2C_vista_a%C3%A9rea_del_delta_del_Okavango%2C_Botsuana%2C_2018-08-01%2C_DD_30.jpg"
  },
  "brazil": {
    "title": "Christ the Redeemer-(Corcovado) front view.jpg",
    "artist": "Mucio Scorzelli",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer-(Corcovado)_front_view.jpg"
  },
  "british-virgin-islands": {
    "title": "Virgin Gorda - The Baths 3.jpg",
    "artist": "P",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Virgin_Gorda_-_The_Baths_3.jpg"
  },
  "brunei": {
    "title": "Sultan Omar Ali Saifuddin Mosque 02.jpg",
    "artist": "sam garza from Los Angeles, USA",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sultan_Omar_Ali_Saifuddin_Mosque_02.jpg"
  },
  "bulgaria": {
    "title": "Rila Monastery yard.jpg",
    "artist": "Daniel Dimitrov",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Rila_Monastery_yard.jpg"
  },
  "burkina-faso": {
    "title": "Cathedrale Ouagadougou.jpg",
    "artist": "Sputniktilt",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cathedrale_Ouagadougou.jpg"
  },
  "cambodia": {
    "title": "Angkor Wat Sunrise (209237385).jpeg",
    "artist": "Reinhard Onasch",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Angkor_Wat_Sunrise_%28209237385%29.jpeg"
  },
  "cameroon": {
    "title": "Pont Wouri 1.jpg",
    "artist": "Steve Mvondo",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Pont_Wouri_1.jpg"
  },
  "canada": {
    "title": "Moraine Lake 17092005.jpg",
    "artist": "Gorgo",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Moraine_Lake_17092005.jpg"
  },
  "cape-verde": {
    "title": "Sal cape verde santa maria - panoramio.jpg",
    "artist": "brunobarbato",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sal_cape_verde_santa_maria_-_panoramio.jpg"
  },
  "cayman-islands": {
    "title": "Seven Mile Beach Facing North.jpg",
    "artist": "Coolcaesar",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Seven_Mile_Beach_Facing_North.jpg"
  },
  "central-african-republic": {
    "title": "Bangui Centre.jpg",
    "artist": "Alllexxxis",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bangui_Centre.jpg"
  },
  "chad": {
    "title": "Ourini Arch at sunset, Ennedi, Chad (40598172781).jpg",
    "artist": "Valerian Guillot",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Ourini_Arch_at_sunset%2C_Ennedi%2C_Chad_%2840598172781%29.jpg"
  },
  "chile": {
    "title": "Cuernos del Paine in Torres del Paine National Park.jpg",
    "artist": "Pedro Szekely from Los Angeles, USA",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cuernos_del_Paine_in_Torres_del_Paine_National_Park.jpg"
  },
  "china": {
    "title": "Great Wall of China, Mutianyu Section.jpg",
    "artist": "Francisco Diez",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Great_Wall_of_China,_Mutianyu_Section.jpg"
  },
  "colombia": {
    "title": "Colombia, Cartagena, Palacio de la Inquisición.jpg",
    "artist": "Thomas Liptak",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Colombia,_Cartagena,_Palacio_de_la_Inquisici%C3%B3n.jpg"
  },
  "comoros": {
    "title": "Moroni beach.jpg",
    "artist": "Radosław Botev",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Moroni_beach.jpg"
  },
  "costa-rica": {
    "title": "Arenal volcano (70785p).jpg",
    "artist": "Rhododendrites",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Arenal_volcano_%2870785p%29.jpg"
  },
  "croatia": {
    "title": "Casco viejo de Dubrovnik, Croacia, 2014-04-14, DD 04.JPG",
    "artist": "Diego Delso",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Casco_viejo_de_Dubrovnik%2C_Croacia%2C_2014-04-14%2C_DD_04.JPG"
  },
  "curacao": {
    "title": "Facades of Handelskade, Willemstad, Curaçao - February 2020.jpg",
    "artist": "Martin Falbisoner",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Facades_of_Handelskade%2C_Willemstad%2C_Cura%C3%A7ao_-_February_2020.jpg"
  },
  "cyprus": {
    "title": "Sea caves Cape Greco 2.jpg",
    "artist": "kallerna",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sea_caves_Cape_Greco_2.jpg"
  },
  "czechia": {
    "title": "Prague Castle and Charles Bridge, Czech Republic - Diliff.jpg",
    "artist": "Diliff",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Prague_Castle_and_Charles_Bridge%2C_Czech_Republic_-_Diliff.jpg"
  },
  "denmark": {
    "title": "2018 - Nyhavn on sunset.jpg",
    "artist": "Moahim",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:2018_-_Nyhavn_on_sunset.jpg"
  },
  "dominica": {
    "title": "Dominica (Caribbean) - Trafalgar Falls - double-falls (32724044870).jpg",
    "artist": "Reinhard Link from Germany",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Dominica_%28Caribbean%29_-_Trafalgar_Falls_-_double-falls_%2832724044870%29.jpg"
  },
  "dominican-republic": {
    "title": "Punta Cana Beach 01.jpg",
    "artist": "NoonIcarus",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Punta_Cana_Beach_01.jpg"
  },
  "dr-congo": {
    "title": "Nyiragongo volcano (30773604383).jpg",
    "artist": "Nina R from Africa",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Nyiragongo_volcano_%2830773604383%29.jpg"
  },
  "ecuador": {
    "title": "Staré město, Quito.jpg",
    "artist": "Ondřej Žváček",
    "license": "CC BY 2.5",
    "source": "https://commons.wikimedia.org/wiki/File:Star%C3%A9_m%C4%9Bsto%2C_Quito.jpg"
  },
  "egypt": {
    "title": "Giza 2019-11-03o.jpg",
    "artist": "Djehouty",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Giza_2019-11-03o.jpg"
  },
  "el-salvador": {
    "title": "Cratère du Volcan de Santa Ana, Salvador.jpg",
    "artist": "Emberlifi",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Crat%C3%A8re_du_Volcan_de_Santa_Ana%2C_Salvador.jpg"
  },
  "estonia": {
    "title": "Tallinna vanalinn päikesetõusu ajal.jpg",
    "artist": "Hendrik Mändla",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Tallinna_vanalinn_p%C3%A4ikeset%C3%B5usu_ajal.jpg"
  },
  "eswatini": {
    "title": "Mlilwane Wildlife Sanctuary 02.jpg",
    "artist": "Bernard Gagnon",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Mlilwane_Wildlife_Sanctuary_02.jpg"
  },
  "europe": {
    "title": "Six European landmarks, a composite by Ringo: Paris, Rome, London, Barcelona, Berlin and the Matterhorn",
    "artist": "",
    "license": "",
    "source": "https://commons.wikimedia.org/wiki/File:Paris_skyline_from_the_observation_deck_of_the_Montparnasse_tower,_July_2015.jpg",
    "parts": [
      {
        "title": "Paris skyline from the observation deck of the Montparnasse tower, July 2015.jpg",
        "artist": "Joe deSousa",
        "license": "CC0",
        "source": "https://commons.wikimedia.org/wiki/File:Paris_skyline_from_the_observation_deck_of_the_Montparnasse_tower,_July_2015.jpg"
      },
      {
        "title": "Colosseum of Rome, Italy.jpg",
        "artist": "Wilfredor",
        "license": "CC0",
        "source": "https://commons.wikimedia.org/wiki/File:Colosseum_of_Rome,_Italy.jpg"
      },
      {
        "title": "Tower Bridge from London City Hall 2015.jpg",
        "artist": "Colin",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:Tower_Bridge_from_London_City_Hall_2015.jpg"
      },
      {
        "title": "143 Basílica de la Sagrada Família (Barcelona), façana del c. Provença, torres i sagristia.jpg",
        "artist": "Enric",
        "license": "CC BY-SA 4.0",
        "source": "https://commons.wikimedia.org/wiki/File:143_Bas%C3%ADlica_de_la_Sagrada_Fam%C3%ADlia_(Barcelona),_fa%C3%A7ana_del_c._Proven%C3%A7a,_torres_i_sagristia.jpg"
      },
      {
        "title": "Brandenburg Gate - Brandenburger Tor - Berlin - Germany - 02.jpg",
        "artist": "Norbert Nagel",
        "license": "CC BY-SA 3.0",
        "source": "https://commons.wikimedia.org/wiki/File:Brandenburg_Gate_-_Brandenburger_Tor_-_Berlin_-_Germany_-_02.jpg"
      },
      {
        "title": "Alps of Switzerland Matterhorn and Stellisee (27679805859).jpg",
        "artist": "kuhnmi",
        "license": "CC BY 2.0",
        "source": "https://commons.wikimedia.org/wiki/File:Alps_of_Switzerland_Matterhorn_and_Stellisee_(27679805859).jpg"
      }
    ]
  },
  "faroe-islands": {
    "title": "Waterfall at Gasadalur, Faroe Islands.jpg",
    "artist": "Felipe Tofani",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Waterfall_at_Gasadalur%2C_Faroe_Islands.jpg"
  },
  "fiji": {
    "title": "Palm trees, Naviti island, Yasawa, Fiji (1) - August 2016.jpg",
    "artist": "Rickard Törnblad",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Palm_trees%2C_Naviti_island%2C_Yasawa%2C_Fiji_%281%29_-_August_2016.jpg"
  },
  "finland": {
    "title": "Helsinki Senate Square and Helsinki Cathedral in May 2026.jpg",
    "artist": "JIP",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Helsinki_Senate_Square_and_Helsinki_Cathedral_in_May_2026.jpg"
  },
  "france": {
    "title": "Trocadero from Eiffel Tower (Unsplash).jpg",
    "artist": "Jace Grandinetti jacegrandinetti",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Trocadero_from_Eiffel_Tower_(Unsplash).jpg"
  },
  "french-guiana": {
    "title": "Ile Royale musée du bagne.jpg",
    "artist": "Cayambe",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Ile_Royale_mus%C3%A9e_du_bagne.jpg"
  },
  "french-polynesia": {
    "title": "Bora Bora (16542797633).jpg",
    "artist": "The TerraMar Project",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bora_Bora_%2816542797633%29.jpg"
  },
  "gabon": {
    "title": "Gabon Loango National Park Elephant with offspring.jpeg",
    "artist": "Kurt Dundy at English Wikipedia",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Gabon_Loango_National_Park_Elephant_with_offspring.jpeg"
  },
  "gambia": {
    "title": "Sunrise at the Gambia River in Banjul, the Gambia - 2010.jpg",
    "artist": "Forbes Johnston",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sunrise_at_the_Gambia_River_in_Banjul%2C_the_Gambia_-_2010.jpg"
  },
  "georgia": {
    "title": "View of Tbilisi from Narikala fortress (2011).jpg",
    "artist": "Simon",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:View_of_Tbilisi_from_Narikala_fortress_%282011%29.jpg"
  },
  "germany": {
    "title": "Brandenburg Gate - Brandenburger Tor - Berlin - Germany - 02.jpg",
    "artist": "Norbert Nagel",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Brandenburg_Gate_-_Brandenburger_Tor_-_Berlin_-_Germany_-_02.jpg"
  },
  "ghana": {
    "title": "Independence Square, Korle-Klottey (IMG 20230201 124359 1).jpg",
    "artist": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Independence_Square%2C_Korle-Klottey_%28IMG_20230201_124359_1%29.jpg"
  },
  "gibraltar": {
    "title": "Rock-of-Gibraltar-2011.jpg",
    "artist": "Acediscovery",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Rock-of-Gibraltar-2011.jpg"
  },
  "global": {
    "title": "An orbital sunrise crowns Earth's horizon (iss072e340644).jpg",
    "artist": "NASA Johnson Space Center",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:An_orbital_sunrise_crowns_Earth%27s_horizon_(iss072e340644).jpg"
  },
  "greece": {
    "title": "Oia Sunset - Santorini, Greece - August 2008.jpg",
    "artist": "Saolo996",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Oia_Sunset_-_Santorini,_Greece_-_August_2008.jpg"
  },
  "greenland": {
    "title": "Iceberg in the Ilulissat Icefjord, Greenland (54067514893).jpg",
    "artist": "Christoph Strässler",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Iceberg_in_the_Ilulissat_Icefjord%2C_Greenland_%2854067514893%29.jpg"
  },
  "grenada": {
    "title": "Grenada (Grand Anse Beach) 2.JPG",
    "artist": "dpursoo",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Grenada_%28Grand_Anse_Beach%29_2.JPG"
  },
  "guadeloupe": {
    "title": "Beach in Sainte-Anne, Guadeloupe.jpg",
    "artist": "ROLLAND POMARET",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Beach_in_Sainte-Anne%2C_Guadeloupe.jpg"
  },
  "guam": {
    "title": "Two lovers point (80103943).jpg",
    "artist": "Dorothy from USA",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Two_lovers_point_%2880103943%29.jpg"
  },
  "guatemala": {
    "title": "Vista hacia Volcan de Agua - Antigua Guatemala 2022.jpg",
    "artist": "Erik Cleves Kristensen",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Vista_hacia_Volcan_de_Agua_-_Antigua_Guatemala_2022.jpg"
  },
  "guernsey": {
    "title": "Guernsey.jpg",
    "artist": "Steve Johnson",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Guernsey.jpg"
  },
  "guinea": {
    "title": "Fouta Djallon (14605324965).jpg",
    "artist": "Maarten van der Bent",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Fouta_Djallon_%2814605324965%29.jpg"
  },
  "guinea-bissau": {
    "title": "Palácio Presidencial em Bissau (2).jpg",
    "artist": "Joehawkins",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Pal%C3%A1cio_Presidencial_em_Bissau_%282%29.jpg"
  },
  "guyana": {
    "title": "Kaieteur Falls Guyana (2) 2007.jpg",
    "artist": "Bill Cameron",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kaieteur_Falls_Guyana_%282%29_2007.jpg"
  },
  "haiti": {
    "title": "Citadelle Laferrière guns 2.jpg",
    "artist": "Rémi Kaupp",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Citadelle_Laferri%C3%A8re_guns_2.jpg"
  },
  "honduras": {
    "title": "West Bay Beach -Roatan -Honduras-23May2009-c.jpg",
    "artist": "Adalberto Hernandez Vega",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:West_Bay_Beach_-Roatan_-Honduras-23May2009-c.jpg"
  },
  "hong-kong": {
    "title": "Hong Kong Skyline Restitch - Dec 2007.jpg",
    "artist": "Diliff",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Hong_Kong_Skyline_Restitch_-_Dec_2007.jpg"
  },
  "hungary": {
    "title": "Budapest Parliament 4604.JPG",
    "artist": "Dirk Beyer",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Budapest_Parliament_4604.JPG"
  },
  "iceland": {
    "title": "Skógafoss Waterfall, Iceland, 20240720 1411 3075.jpg",
    "artist": "Jakub Hałun",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sk%C3%B3gafoss_Waterfall,_Iceland,_20240720_1411_3075.jpg"
  },
  "india": {
    "title": "Aks The Reflection Taj Mahal.jpg",
    "artist": "Antrix3",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Aks_The_Reflection_Taj_Mahal.jpg"
  },
  "indonesia": {
    "title": "Tegalalang Rice Terrace - Subak Ceking on Bali 11.jpg",
    "artist": "Anggabuana",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Tegalalang_Rice_Terrace_-_Subak_Ceking_on_Bali_11.jpg"
  },
  "iraq": {
    "title": "Hawler Castle.jpg",
    "artist": "jan kurdistani",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Hawler_Castle.jpg"
  },
  "ireland": {
    "title": "Ireland Cliffs of Moher BW 2025-09-11 14-27-51.jpg",
    "artist": "Berthold Werner",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Ireland_Cliffs_of_Moher_BW_2025-09-11_14-27-51.jpg"
  },
  "isle-of-man": {
    "title": "Isle of Man Peel Castle.jpg",
    "artist": "Finn Bjorklid",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Isle_of_Man_Peel_Castle.jpg"
  },
  "israel": {
    "title": "Jerusalem-2013(2)-Temple Mount-Dome of the Rock (SE exposure).jpg",
    "artist": "Godot13",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Jerusalem-2013%282%29-Temple_Mount-Dome_of_the_Rock_%28SE_exposure%29.jpg"
  },
  "italy": {
    "title": "Colosseum of Rome, Italy.jpg",
    "artist": "Wilfredor",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Colosseum_of_Rome,_Italy.jpg"
  },
  "ivory-coast": {
    "title": "Basilique notre Dame de la Paix de Yamoussoukro 9.jpg",
    "artist": "Didierwiki",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Basilique_notre_Dame_de_la_Paix_de_Yamoussoukro_9.jpg"
  },
  "jamaica": {
    "title": "Jamaica - Negril - 048.jpg",
    "artist": "Oleg Yunakov",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Jamaica_-_Negril_-_048.jpg"
  },
  "japan": {
    "title": "Shibuya and Mount Fuji seen from Roppongi Hills.jpg",
    "artist": "Syced",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Shibuya_and_Mount_Fuji_seen_from_Roppongi_Hills.jpg"
  },
  "jersey": {
    "title": "Mont Orgueil and Gorey.jpg",
    "artist": "Daniel Kraft",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Mont_Orgueil_and_Gorey.jpg"
  },
  "jordan": {
    "title": "Al-Khazneh (The Treasury) 2, Petra, Jordan.jpg",
    "artist": "Vyacheslav Argenberg",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Al-Khazneh_%28The_Treasury%29_2%2C_Petra%2C_Jordan.jpg"
  },
  "kazakhstan": {
    "title": "Astana-2021-10 - 12.jpg",
    "artist": "Vyacheslav Bukharov",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Astana-2021-10_-_12.jpg"
  },
  "kenya": {
    "title": "Buffalo Nairobi Skyline Savannah Kenya May19 R1600769.jpg",
    "artist": "Timothy A. Gonsalves",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Buffalo_Nairobi_Skyline_Savannah_Kenya_May19_R1600769.jpg"
  },
  "kiribati": {
    "title": "South Tarawa from the air.jpg",
    "artist": "Government of Kiribati",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:South_Tarawa_from_the_air.jpg"
  },
  "kosovo": {
    "title": "Vista de Prizren, Kosovo, 2014-04-16, DD 15.JPG",
    "artist": "Diego Delso",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Vista_de_Prizren%2C_Kosovo%2C_2014-04-16%2C_DD_15.JPG"
  },
  "kuwait": {
    "title": "Kuwait towers.jpg",
    "artist": "Mikael Lindmark",
    "license": "CC BY-SA 2.5 se",
    "source": "https://commons.wikimedia.org/wiki/File:Kuwait_towers.jpg"
  },
  "kyrgyzstan": {
    "title": "Issyk kul Lake mountains.jpg",
    "artist": "Jaya govinda",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Issyk_kul_Lake_mountains.jpg"
  },
  "laos": {
    "title": "Kuang Si Falls and a turquoise water pool in Luang Prabang province Laos.jpg",
    "artist": "Basile Morin",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kuang_Si_Falls_and_a_turquoise_water_pool_in_Luang_Prabang_province_Laos.jpg"
  },
  "latam": {
    "title": "Rio de Janeiro city from Pão de Açúcar, Brazil.jpg",
    "artist": "Wilfredor",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Rio_de_Janeiro_city_from_P%C3%A3o_de_A%C3%A7%C3%BAcar,_Brazil.jpg"
  },
  "latvia": {
    "title": "House of Blackheads and St. Peter's Church Tower, Riga, Latvia - Diliff.jpg",
    "artist": "Diliff",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:House_of_Blackheads_and_St._Peter%27s_Church_Tower%2C_Riga%2C_Latvia_-_Diliff.jpg"
  },
  "lebanon": {
    "title": "A sunset on the Mediterranean sea, Pigeon Rocks, Beirut, Lebanon.jpg",
    "artist": "Vyacheslav Argenberg",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:A_sunset_on_the_Mediterranean_sea%2C_Pigeon_Rocks%2C_Beirut%2C_Lebanon.jpg"
  },
  "lesotho": {
    "title": "Maletsunyanefalls.JPG",
    "artist": "BagelBelt",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Maletsunyanefalls.JPG"
  },
  "liberia": {
    "title": "Robertsport Liberia.jpg",
    "artist": "Erik Cleves Kristensen",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Robertsport_Liberia.jpg"
  },
  "liechtenstein": {
    "title": "Vaduz Castle, Liechtenstein, 20250502 1326 8609.jpg",
    "artist": "Jakub Hałun",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Vaduz_Castle%2C_Liechtenstein%2C_20250502_1326_8609.jpg"
  },
  "lithuania": {
    "title": "Vilnius - Panorama 02.jpg",
    "artist": "Lestat",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Vilnius_-_Panorama_02.jpg"
  },
  "luxembourg": {
    "title": "Luxembourg Grund Alzette Pétrusse.jpg",
    "artist": "Cayambe",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Luxembourg_Grund_Alzette_P%C3%A9trusse.jpg"
  },
  "macau": {
    "title": "Ruins of the Church of St Paul (1387721220).jpg",
    "artist": "edwin",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Ruins_of_the_Church_of_St_Paul_%281387721220%29.jpg"
  },
  "madagascar": {
    "title": "\" Avenue of the Baobabs \" (Adansonia grandidieri) (9576865450).jpg",
    "artist": "Bernard DUPONT from FRANCE",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:%22_Avenue_of_the_Baobabs_%22_%28Adansonia_grandidieri%29_%289576865450%29.jpg"
  },
  "malawi": {
    "title": "Lake Malawi, Malawi (2499200974).jpg",
    "artist": "Joachim Huber from Switzerland",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Lake_Malawi%2C_Malawi_%282499200974%29.jpg"
  },
  "malaysia": {
    "title": "The Twins SE Asia 2019 (49171985716).jpg",
    "artist": "James Kerwin from Tbilisi",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:The_Twins_SE_Asia_2019_(49171985716).jpg"
  },
  "maldives": {
    "title": "Reethi Beach Maldives.jpg",
    "artist": "Michael Hobi",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Reethi_Beach_Maldives.jpg"
  },
  "mali": {
    "title": "MaliDjennéMosquée.JPG",
    "artist": "BluesyPete",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:MaliDjenn%C3%A9Mosqu%C3%A9e.JPG"
  },
  "malta": {
    "title": "Valletta, Malta's Grand Harbor.jpg",
    "artist": "TerryDOtt",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Valletta%2C_Malta%27s_Grand_Harbor.jpg"
  },
  "martinique": {
    "title": "Bay of Fort de France.jpg",
    "artist": "Sapakagadewmoinjadiw",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bay_of_Fort_de_France.jpg"
  },
  "mauritania": {
    "title": "Chinguetti old town street.jpg",
    "artist": "Radosław Botev",
    "license": "CC BY 3.0 pl",
    "source": "https://commons.wikimedia.org/wiki/File:Chinguetti_old_town_street.jpg"
  },
  "mauritius": {
    "title": "Le Morne Peninsula in Mauritius (53697779236).jpg",
    "artist": "\"dronepicr\"",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Le_Morne_Peninsula_in_Mauritius_%2853697779236%29.jpg"
  },
  "mayotte": {
    "title": "Sakouli baobabs.jpg",
    "artist": "Frédéric Ducarme",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sakouli_baobabs.jpg"
  },
  "mexico": {
    "title": "Pyramid of Kukulkan Chichen Itza 04.JPG",
    "artist": "Altairisfar",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Pyramid_of_Kukulkan_Chichen_Itza_04.JPG"
  },
  "middle-east": {
    "title": "Burj Khalifa (worlds tallest building) and the Dubai skyline (25781049892).jpg",
    "artist": "imran shahabuddin",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Burj_Khalifa_(worlds_tallest_building)_and_the_Dubai_skyline_(25781049892).jpg"
  },
  "moldova": {
    "title": "Nativity Cathedral, Chișinău.jpg",
    "artist": "Pudelek",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Nativity_Cathedral%2C_Chi%C8%99in%C4%83u.jpg"
  },
  "mongolia": {
    "title": "Krajobraz w Parku Narodowym Gorchi-Tereldż 63.JPG",
    "artist": "Marcin Konsek",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Krajobraz_w_Parku_Narodowym_Gorchi-Tereld%C5%BC_63.JPG"
  },
  "montenegro": {
    "title": "Kotor and Boka kotorska - view from city wall.jpg",
    "artist": "Pudelek",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kotor_and_Boka_kotorska_-_view_from_city_wall.jpg"
  },
  "montserrat": {
    "title": "Soufriere Hills.jpg",
    "artist": "CommonismNow",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Soufriere_Hills.jpg"
  },
  "morocco": {
    "title": "A01 - Marrakech, Koutoubia.jpg",
    "artist": "Misa.stefanovic.07",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:A01_-_Marrakech,_Koutoubia.jpg"
  },
  "mozambique": {
    "title": "60 Skyline (36931644911).jpg",
    "artist": "Cornelius Kibelka from Berlin, Germany",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:60_Skyline_%2836931644911%29.jpg"
  },
  "myanmar": {
    "title": "Temples and hot air balloons. (Unsplash).jpg",
    "artist": "Chinh Le Duc mero_dnt",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Temples_and_hot_air_balloons._%28Unsplash%29.jpg"
  },
  "nepal": {
    "title": "Boudha Stupa 2018 04.jpg",
    "artist": "Nabin K",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Boudha_Stupa_2018_04.jpg"
  },
  "netherlands": {
    "title": "Prinsengracht Amsterdam.jpg",
    "artist": "Aforaseem",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Prinsengracht_Amsterdam.jpg"
  },
  "new-caledonia": {
    "title": "Va'a outrigger canoeing at Anse Vata Beach for the 2011 Pacific Games.jpg",
    "artist": "gérard",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Va%27a_outrigger_canoeing_at_Anse_Vata_Beach_for_the_2011_Pacific_Games.jpg"
  },
  "new-zealand": {
    "title": "Milford Sound in Fiordland National Park 12.jpg",
    "artist": "Krzysztof Golik",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Milford_Sound_in_Fiordland_National_Park_12.jpg"
  },
  "nicaragua": {
    "title": "Catedral de Granada, Nicaragua 2.jpg",
    "artist": "ruben i",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Catedral_de_Granada%2C_Nicaragua_2.jpg"
  },
  "niger": {
    "title": "Niger river in Niamey.jpg",
    "artist": "diasUndKompott",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Niger_river_in_Niamey.jpg"
  },
  "nigeria": {
    "title": "Lagos skyline.jpg",
    "artist": "Clara Sanchiz",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Lagos_skyline.jpg"
  },
  "north-macedonia": {
    "title": "Church of St. John at Kaneo 6.jpg",
    "artist": "kallerna",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Church_of_St._John_at_Kaneo_6.jpg"
  },
  "norway": {
    "title": "Geirangerfjord from Ørnesvingen, 2013 June.jpg",
    "artist": "Ximonic",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Geirangerfjord_from_%C3%98rnesvingen%2C_2013_June.jpg"
  },
  "oman": {
    "title": "Palacio de Al Alam, Mascate, Omán, 2024-08-14, DD 33.jpg",
    "artist": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Palacio_de_Al_Alam%2C_Mascate%2C_Om%C3%A1n%2C_2024-08-14%2C_DD_33.jpg"
  },
  "pakistan": {
    "title": "Badshahi Mosque in Lahore ,Pakistan 03.jpg",
    "artist": "Harvinder Chandigarh",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Badshahi_Mosque_in_Lahore_%2CPakistan_03.jpg"
  },
  "palau": {
    "title": "Rock-Islands-Palau-1-2016-sea-view-Luka-Peternel.jpg",
    "artist": "Luka Peternel",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Rock-Islands-Palau-1-2016-sea-view-Luka-Peternel.jpg"
  },
  "palestine": {
    "title": "Manger Square.jpg",
    "artist": "Alexey Goral",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Manger_Square.jpg"
  },
  "panama": {
    "title": "Panama City Skyline 1.jpg",
    "artist": "Dr",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Panama_City_Skyline_1.jpg"
  },
  "papua-new-guinea": {
    "title": "Ela Beach May 2015.jpg",
    "artist": "Nick-D",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Ela_Beach_May_2015.jpg"
  },
  "paraguay": {
    "title": "00 3819 Asunción - Paraguay (Südamerika).jpg",
    "artist": "W",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:00_3819_Asunci%C3%B3n_-_Paraguay_%28S%C3%BCdamerika%29.jpg"
  },
  "peru": {
    "title": "Machu Picchu, Perú, 2015-07-30, DD 47.JPG",
    "artist": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Machu_Picchu%2C_Per%C3%BA%2C_2015-07-30%2C_DD_47.JPG"
  },
  "philippines": {
    "title": "Island lagoon in Bacuit Bay, El Nido, Palawan, Philippines.jpg",
    "artist": "Vyacheslav Argenberg",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Island_lagoon_in_Bacuit_Bay%2C_El_Nido%2C_Palawan%2C_Philippines.jpg"
  },
  "poland": {
    "title": "20200826 Wawel i Wisła w Krakowie 1752 1334.jpg",
    "artist": "Jakub Hałun",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:20200826_Wawel_i_Wis%C5%82a_w_Krakowie_1752_1334.jpg"
  },
  "portugal": {
    "title": "Alfama, Lisbon, Portugal July 2021 - Tram.jpg",
    "artist": "Sharon Hahn Darlin",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Alfama,_Lisbon,_Portugal_July_2021_-_Tram.jpg"
  },
  "puerto-rico": {
    "title": "USA-2016-Puerto Rico-San Juan-Castillo San Felipe del Morro 10.jpg",
    "artist": "Godot13",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:USA-2016-Puerto_Rico-San_Juan-Castillo_San_Felipe_del_Morro_10.jpg"
  },
  "qatar": {
    "title": "Doha - West Bay Skyline 04.jpg",
    "artist": "P",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Doha_-_West_Bay_Skyline_04.jpg"
  },
  "republic-of-the-congo": {
    "title": "Brazzaville - Basilique Sainte-Anne-du-Congo.jpg",
    "artist": "Henri van der Noot",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Brazzaville_-_Basilique_Sainte-Anne-du-Congo.jpg"
  },
  "reunion": {
    "title": "Piton de La Fournaise - Paysage de l'île de La Réunion.jpg",
    "artist": "Alexandre Péribé",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Piton_de_La_Fournaise_-_Paysage_de_l%27%C3%AEle_de_La_R%C3%A9union.jpg"
  },
  "romania": {
    "title": "Bran Castle TB1.jpg",
    "artist": "Todor Bozhinov",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bran_Castle_TB1.jpg"
  },
  "rwanda": {
    "title": "Kigali skyline.jpg",
    "artist": "Honeybarger",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kigali_skyline.jpg"
  },
  "saint-barthelemy": {
    "title": "Gustavia Harbour St Barthelemy.JPG",
    "artist": "Kevin Gabbert",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Gustavia_Harbour_St_Barthelemy.JPG"
  },
  "saint-kitts-and-nevis": {
    "title": "Saint Kitts - Brimstone Hill Fortress 03.JPG",
    "artist": "Martin Falbisoner",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Saint_Kitts_-_Brimstone_Hill_Fortress_03.JPG"
  },
  "saint-lucia": {
    "title": "Soufriere town and the Pitons, Saint Lucia (wide view).jpg",
    "artist": "DavidMPyle",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Soufriere_town_and_the_Pitons%2C_Saint_Lucia_%28wide_view%29.jpg"
  },
  "saint-martin": {
    "title": "Orient Bay, SXM island in the Caribbean.JPG",
    "artist": "Clavius66",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Orient_Bay%2C_SXM_island_in_the_Caribbean.JPG"
  },
  "saint-vincent-and-the-grenadines": {
    "title": "Tobago Cays Rainbow - panoramio.jpg",
    "artist": "FishSpeaker",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Tobago_Cays_Rainbow_-_panoramio.jpg"
  },
  "san-marino": {
    "title": "Fortress of Guaita 2013-09-19.jpg",
    "artist": "Max_Ryazanov",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Fortress_of_Guaita_2013-09-19.jpg"
  },
  "saudi-arabia": {
    "title": "Riyadh Skyline.jpg",
    "artist": "B",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Riyadh_Skyline.jpg"
  },
  "senegal": {
    "title": "Dakar-Mamelles cliff.jpg",
    "artist": "Jeff Attaway from Abuja, Nigeria",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Dakar-Mamelles_cliff.jpg"
  },
  "serbia": {
    "title": "Belgrade Fortress Kalemegdan-9878.NEF.jpg",
    "artist": "Zcvetkovic",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Belgrade_Fortress_Kalemegdan-9878.NEF.jpg"
  },
  "seychelles": {
    "title": "Anse Source d'Argent 3-La Digue.jpg",
    "artist": "Tobias Alt, Tobi 87",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Anse_Source_d%27Argent_3-La_Digue.jpg"
  },
  "sierra-leone": {
    "title": "Fort Thornton - Freetown - Sierra Leone.jpg",
    "artist": "Brian Harrington Spier",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Fort_Thornton_-_Freetown_-_Sierra_Leone.jpg"
  },
  "singapore": {
    "title": "Marina Bay Sands, Singapore 1.jpg",
    "artist": "Ray in Manila",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Marina_Bay_Sands,_Singapore_1.jpg"
  },
  "sint-maarten": {
    "title": "Maho Beach, St Maarten, Oct 2014 (15472388628).jpg",
    "artist": "alljengi from Edinburgh",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Maho_Beach%2C_St_Maarten%2C_Oct_2014_%2815472388628%29.jpg"
  },
  "slovakia": {
    "title": "Bratislava Castle, 20210727 1004 0250.jpg",
    "artist": "Jakub Hałun",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bratislava_Castle%2C_20210727_1004_0250.jpg"
  },
  "slovenia": {
    "title": "Bled Island & Bled Castle (1).jpg",
    "artist": "Krzysztof Golik",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bled_Island_%26_Bled_Castle_%281%29.jpg"
  },
  "south-africa": {
    "title": "Cape Town, Table Mountain - panoramio (3).jpg",
    "artist": "scott marsland",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cape_Town,_Table_Mountain_-_panoramio_(3).jpg"
  },
  "south-korea": {
    "title": "Seoul (175734251).jpeg",
    "artist": "Joon Kyu Park",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Seoul_(175734251).jpeg"
  },
  "south-sudan": {
    "title": "Juba City.jpg",
    "artist": "Rigan123",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Juba_City.jpg"
  },
  "spain": {
    "title": "143 Basílica de la Sagrada Família (Barcelona), façana del c. Provença, torres i sagristia.jpg",
    "artist": "Enric",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:143_Bas%C3%ADlica_de_la_Sagrada_Fam%C3%ADlia_(Barcelona),_fa%C3%A7ana_del_c._Proven%C3%A7a,_torres_i_sagristia.jpg"
  },
  "sri-lanka": {
    "title": "Sigiriya Rock Fortress View from Pidurangala Rock.jpg",
    "artist": "Gayomiw",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_Fortress_View_from_Pidurangala_Rock.jpg"
  },
  "sudan": {
    "title": "Pyramids of Meroe in Bajrawiya, Sudan 09.jpg",
    "artist": "Ahmed Amir",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Pyramids_of_Meroe_in_Bajrawiya%2C_Sudan_09.jpg"
  },
  "suriname": {
    "title": "Houses at Waterkant, Paramaribo.JPG",
    "artist": "Mark Ahsmann",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Houses_at_Waterkant%2C_Paramaribo.JPG"
  },
  "sweden": {
    "title": "Sweden, Stockholm, Gamla Stan (Old Town), Dusk 150628-69.jpg",
    "artist": "Richardmaackphotography",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sweden%2C_Stockholm%2C_Gamla_Stan_%28Old_Town%29%2C_Dusk_150628-69.jpg"
  },
  "switzerland": {
    "title": "Alps of Switzerland Matterhorn and Stellisee (27679805859).jpg",
    "artist": "kuhnmi",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Alps_of_Switzerland_Matterhorn_and_Stellisee_(27679805859).jpg"
  },
  "taiwan": {
    "title": "Taipei Taiwan Taipei-101-Tower-01.jpg",
    "artist": "CEphoto, Uwe Aranas",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Taipei_Taiwan_Taipei-101-Tower-01.jpg"
  },
  "tajikistan": {
    "title": "Iskander-kul, Tajikistan.JPG",
    "artist": "Rjruiziii",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Iskander-kul%2C_Tajikistan.JPG"
  },
  "tanzania": {
    "title": "Kilimanjaro from Amboseli.jpg",
    "artist": "Sergey Pesterev",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kilimanjaro_from_Amboseli.jpg"
  },
  "thailand": {
    "title": "Before Sunset at Wat Arun, entrance to ordination hall.jpg",
    "artist": "Supanut Arunoprayote",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Before_Sunset_at_Wat_Arun,_entrance_to_ordination_hall.jpg"
  },
  "togo": {
    "title": "Lome Togo Beach Road.jpg",
    "artist": "Philip Nalangan",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Lome_Togo_Beach_Road.jpg"
  },
  "tonga": {
    "title": "Tonga Royal Palace Oct 08.jpg",
    "artist": "Tofoa Felix",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Tonga_Royal_Palace_Oct_08.jpg"
  },
  "trinidad-and-tobago": {
    "title": "Pigeon Point beach.jpg",
    "artist": "Kp93",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Pigeon_Point_beach.jpg"
  },
  "tunisia": {
    "title": "Sidi Bou Said 03.jpg",
    "artist": "Rene Cortin",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sidi_Bou_Said_03.jpg"
  },
  "turkey": {
    "title": "Istanbul sunset 1480511.JPG",
    "artist": "Nevit Dilmen",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Istanbul_sunset_1480511.JPG"
  },
  "turks-and-caicos": {
    "title": "Sunset in Grace Bay, Turks and Caicos Islands.jpg",
    "artist": "Jason Boldero",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sunset_in_Grace_Bay%2C_Turks_and_Caicos_Islands.jpg"
  },
  "uae": {
    "title": "Burj Khalifa Dubai, UAE at Sunset 001 by Eric Chamchoum.jpg",
    "artist": "ECWiki1",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Burj_Khalifa_Dubai,_UAE_at_Sunset_001_by_Eric_Chamchoum.jpg"
  },
  "uganda": {
    "title": "Kampala skyline.jpg",
    "artist": "Todd Huffman from Phoenix, AZ",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kampala_skyline.jpg"
  },
  "united-kingdom": {
    "title": "Tower Bridge from London City Hall 2015.jpg",
    "artist": "Colin",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Tower_Bridge_from_London_City_Hall_2015.jpg"
  },
  "uruguay": {
    "title": "Montevideo Rambla-20110506-RM-120836.jpg",
    "artist": "Ermell",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Montevideo_Rambla-20110506-RM-120836.jpg"
  },
  "us-virgin-islands": {
    "title": "Trunk Bay, St. John USVI.jpg",
    "artist": "Navin75",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Trunk_Bay%2C_St._John_USVI.jpg"
  },
  "usa": {
    "title": "View of Lower Manhattan from Little Island, New York City, 20231001 1818 1506.jpg",
    "artist": "Jakub Hałun",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:View_of_Lower_Manhattan_from_Little_Island,_New_York_City,_20231001_1818_1506.jpg"
  },
  "uzbekistan": {
    "title": "Registan Samarkand Uzbekistan.JPG",
    "artist": "Stomac",
    "license": "CC BY-SA 2.0 fr",
    "source": "https://commons.wikimedia.org/wiki/File:Registan_Samarkand_Uzbekistan.JPG"
  },
  "vanuatu": {
    "title": "Port Vila Harbour, Vanuatu (380280436).jpg",
    "artist": "Phillip Capper",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Port_Vila_Harbour%2C_Vanuatu_%28380280436%29.jpg"
  },
  "venezuela": {
    "title": "Salto del Angel-Canaima-Venezuela18.JPG",
    "artist": "Diego Delso",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Salto_del_Angel-Canaima-Venezuela18.JPG"
  },
  "vietnam": {
    "title": "Halong Bay Titov island (25712).jpg",
    "artist": "Andre Hospers",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Halong_Bay_Titov_island_(25712).jpg"
  },
  "zambia": {
    "title": "Cataratas Victoria, Zambia-Zimbabue, 2018-07-27, DD 05.jpg",
    "artist": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cataratas_Victoria%2C_Zambia-Zimbabue%2C_2018-07-27%2C_DD_05.jpg"
  }
};

export const BUNDLED_PICTURE_CREDITS: Record<string, PictureCredit> = {
  "europe": {
    "title": "Eiffel Tower and Pont Alexandre III at night.jpg",
    "artist": "Getfunky Paris",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Eiffel_Tower_and_Pont_Alexandre_III_at_night.jpg"
  },
  "usa": {
    "title": "Golden Gate Bridge as seen from Marshall’s Beach, March 2018.jpg",
    "artist": "Frank Schulenburg",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_as_seen_from_Marshall%E2%80%99s_Beach,_March_2018.jpg"
  },
  "asia": {
    "title": "Angkor Wat with its reflection (cropped).jpg",
    "artist": "Satdeep Gill",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Angkor_Wat_with_its_reflection_(cropped).jpg"
  },
  "latam": {
    "title": "80 - Machu Picchu - Juin 2009 - edit.jpg",
    "artist": "Martin St-Amant (S23678)",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:80_-_Machu_Picchu_-_Juin_2009_-_edit.jpg"
  },
  "middle-east": {
    "title": "Petra , Al-Khazneh 2.jpg",
    "artist": "Faraheed",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Petra_,_Al-Khazneh_2.jpg"
  },
  "indonesia": {
    "title": "Borobudur-Nothwest-view.jpg",
    "artist": "Gunawan Kartapranata",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Borobudur-Nothwest-view.jpg"
  },
  "south-korea": {
    "title": "Gyeonghoeru (Royal Banquet Hall) at Gyeongbokgung Palace, Seoul.jpg",
    "artist": "Frank Schulenburg",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Gyeonghoeru_(Royal_Banquet_Hall)_at_Gyeongbokgung_Palace,_Seoul.jpg"
  },
  "iceland": {
    "title": "Kirkjufell, Iceland, 20240714 1631 0713.jpg",
    "artist": "Jakub Hałun",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Kirkjufell,_Iceland,_20240714_1631_0713.jpg"
  },
  "turkey": {
    "title": "Hagia Sophia Mars 2013.jpg",
    "artist": "Arild Vågen",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Hagia_Sophia_Mars_2013.jpg"
  },
  "canada": {
    "title": "Sunset Toronto Skyline Panorama Crop from Snake Island.jpg",
    "artist": "Jchmrt",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sunset_Toronto_Skyline_Panorama_Crop_from_Snake_Island.jpg"
  },
  "colombia": {
    "title": "Clock tower (Cartagena, Columbia).jpg",
    "artist": "Leon petrosyan",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Clock_tower_(Cartagena,_Columbia).jpg"
  },
  "new-zealand": {
    "title": "Milford Sound Mitre Peak Cabbage tree Toetoe.JPG",
    "artist": "MurielBendel",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Milford_Sound_Mitre_Peak_Cabbage_tree_Toetoe.JPG"
  }
};
