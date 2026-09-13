// pictureCredits.ts — every destination photograph in the app, with its
// author and licence (Wikimedia Commons; the NASA one is public domain).
// Shown under Help so the CC BY attributions travel with the pictures.
export interface PictureCredit { title: string; artist: string; license: string; source: string }
export const PICTURE_CREDITS: Record<string, PictureCredit> = {
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
  "japan": {
    "title": "Shibuya and Mount Fuji seen from Roppongi Hills.jpg",
    "artist": "Syced",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Shibuya_and_Mount_Fuji_seen_from_Roppongi_Hills.jpg"
  },
  "thailand": {
    "title": "Before Sunset at Wat Arun, entrance to ordination hall.jpg",
    "artist": "Supanut Arunoprayote",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Before_Sunset_at_Wat_Arun,_entrance_to_ordination_hall.jpg"
  },
  "vietnam": {
    "title": "Halong Bay Titov island (25712).jpg",
    "artist": "Andre Hospers",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Halong_Bay_Titov_island_(25712).jpg"
  },
  "indonesia": {
    "title": "Borobudur-Nothwest-view.jpg",
    "artist": "Gunawan Kartapranata",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Borobudur-Nothwest-view.jpg"
  },
  "singapore": {
    "title": "Marina Bay Sands, Singapore 1.jpg",
    "artist": "Ray in Manila",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Marina_Bay_Sands,_Singapore_1.jpg"
  },
  "south-korea": {
    "title": "Gyeonghoeru (Royal Banquet Hall) at Gyeongbokgung Palace, Seoul.jpg",
    "artist": "Frank Schulenburg",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Gyeonghoeru_(Royal_Banquet_Hall)_at_Gyeongbokgung_Palace,_Seoul.jpg"
  },
  "india": {
    "title": "Aks The Reflection Taj Mahal.jpg",
    "artist": "Antrix3",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Aks_The_Reflection_Taj_Mahal.jpg"
  },
  "china": {
    "title": "Great Wall of China, Mutianyu Section.jpg",
    "artist": "Francisco Diez",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Great_Wall_of_China,_Mutianyu_Section.jpg"
  },
  "malaysia": {
    "title": "The Twins SE Asia 2019 (49171985716).jpg",
    "artist": "James Kerwin from Tbilisi",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:The_Twins_SE_Asia_2019_(49171985716).jpg"
  },
  "france": {
    "title": "Trocadero from Eiffel Tower (Unsplash).jpg",
    "artist": "Jace Grandinetti jacegrandinetti",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Trocadero_from_Eiffel_Tower_(Unsplash).jpg"
  },
  "italy": {
    "title": "Colosseum of Rome, Italy.jpg",
    "artist": "Wilfredor",
    "license": "CC0",
    "source": "https://commons.wikimedia.org/wiki/File:Colosseum_of_Rome,_Italy.jpg"
  },
  "spain": {
    "title": "143 Basílica de la Sagrada Família (Barcelona), façana del c. Provença, torres i sagristia.jpg",
    "artist": "Enric",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:143_Bas%C3%ADlica_de_la_Sagrada_Fam%C3%ADlia_(Barcelona),_fa%C3%A7ana_del_c._Proven%C3%A7a,_torres_i_sagristia.jpg"
  },
  "portugal": {
    "title": "Alfama, Lisbon, Portugal July 2021 - Tram.jpg",
    "artist": "Sharon Hahn Darlin",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Alfama,_Lisbon,_Portugal_July_2021_-_Tram.jpg"
  },
  "germany": {
    "title": "Brandenburg Gate - Brandenburger Tor - Berlin - Germany - 02.jpg",
    "artist": "Norbert Nagel",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Brandenburg_Gate_-_Brandenburger_Tor_-_Berlin_-_Germany_-_02.jpg"
  },
  "greece": {
    "title": "Oia Sunset - Santorini, Greece - August 2008.jpg",
    "artist": "Saolo996.\n\nOriginal uploader was Saolo996 at it.wikipedia",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Oia_Sunset_-_Santorini,_Greece_-_August_2008.jpg"
  },
  "united-kingdom": {
    "title": "Tower Bridge from London City Hall 2015.jpg",
    "artist": "Colin",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Tower_Bridge_from_London_City_Hall_2015.jpg"
  },
  "switzerland": {
    "title": "Alps of Switzerland Matterhorn and Stellisee (27679805859).jpg",
    "artist": "kuhnmi",
    "license": "CC BY 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Alps_of_Switzerland_Matterhorn_and_Stellisee_(27679805859).jpg"
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
  "mexico": {
    "title": "Pyramid of Kukulkan Chichen Itza 04.JPG",
    "artist": "Altairisfar",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Pyramid_of_Kukulkan_Chichen_Itza_04.JPG"
  },
  "brazil": {
    "title": "Christ the Redeemer-(Corcovado) front view.jpg",
    "artist": "Mucio Scorzelli",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer-(Corcovado)_front_view.jpg"
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
  "uae": {
    "title": "Burj Khalifa Dubai, UAE at Sunset 001 by Eric Chamchoum.jpg",
    "artist": "ECWiki1",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Burj_Khalifa_Dubai,_UAE_at_Sunset_001_by_Eric_Chamchoum.jpg"
  },
  "morocco": {
    "title": "A01 - Marrakech, Koutoubia.jpg",
    "artist": "Misa.stefanovic.07",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:A01_-_Marrakech,_Koutoubia.jpg"
  },
  "south-africa": {
    "title": "Cape Town, Table Mountain - panoramio (3).jpg",
    "artist": "scott marsland",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Cape_Town,_Table_Mountain_-_panoramio_(3).jpg"
  },
  "egypt": {
    "title": "Giza 2019-11-03o.jpg",
    "artist": "Djehouty",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Giza_2019-11-03o.jpg"
  },
  "australia": {
    "title": "Sydney Opera House and Harbour Bridge, southeast view 20230224 1.jpg",
    "artist": "DXR",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sydney_Opera_House_and_Harbour_Bridge,_southeast_view_20230224_1.jpg"
  },
  "new-zealand": {
    "title": "Milford Sound Mitre Peak Cabbage tree Toetoe.JPG",
    "artist": "MurielBendel",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Milford_Sound_Mitre_Peak_Cabbage_tree_Toetoe.JPG"
  },
  "global": {
    "title": "An orbital sunrise crowns Earth's horizon (iss072e340644).jpg",
    "artist": "NASA Johnson Space Center",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:An_orbital_sunrise_crowns_Earth%27s_horizon_(iss072e340644).jpg"
  }
};
