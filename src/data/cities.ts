// cities.ts — the cities people type into search (owner 2026-10-24: "make
// search searchable also on cities"). Each city names its country by ISO
// code; the store matches that code to the destination that sells it. Capitals,
// the biggest cities and the places travellers fly to, plus common other
// spellings (Munich / München).
export const CITIES: [string, string][] = [
  // Europe
  ['Paris', 'FR'], ['Nice', 'FR'], ['Lyon', 'FR'], ['Marseille', 'FR'], ['Bordeaux', 'FR'], ['Toulouse', 'FR'], ['Strasbourg', 'FR'], ['Cannes', 'FR'], ['Chamonix', 'FR'],
  ['London', 'GB'], ['Manchester', 'GB'], ['Edinburgh', 'GB'], ['Glasgow', 'GB'], ['Liverpool', 'GB'], ['Birmingham', 'GB'], ['Oxford', 'GB'], ['Cambridge', 'GB'], ['Bristol', 'GB'], ['Belfast', 'GB'],
  ['Dublin', 'IE'], ['Cork', 'IE'], ['Galway', 'IE'],
  ['Madrid', 'ES'], ['Barcelona', 'ES'], ['Seville', 'ES'], ['Sevilla', 'ES'], ['Valencia', 'ES'], ['Malaga', 'ES'], ['Ibiza', 'ES'], ['Mallorca', 'ES'], ['Palma', 'ES'], ['Tenerife', 'ES'], ['Gran Canaria', 'ES'], ['Granada', 'ES'], ['Bilbao', 'ES'], ['San Sebastian', 'ES'],
  ['Lisbon', 'PT'], ['Lisboa', 'PT'], ['Porto', 'PT'], ['Faro', 'PT'], ['Madeira', 'PT'], ['Funchal', 'PT'], ['Azores', 'PT'],
  ['Rome', 'IT'], ['Roma', 'IT'], ['Milan', 'IT'], ['Milano', 'IT'], ['Venice', 'IT'], ['Florence', 'IT'], ['Firenze', 'IT'], ['Naples', 'IT'], ['Napoli', 'IT'], ['Amalfi', 'IT'], ['Sicily', 'IT'], ['Palermo', 'IT'], ['Turin', 'IT'], ['Bologna', 'IT'], ['Lake Como', 'IT'], ['Sardinia', 'IT'],
  ['Berlin', 'DE'], ['Munich', 'DE'], ['München', 'DE'], ['Hamburg', 'DE'], ['Frankfurt', 'DE'], ['Cologne', 'DE'], ['Köln', 'DE'], ['Düsseldorf', 'DE'], ['Stuttgart', 'DE'], ['Dresden', 'DE'],
  ['Amsterdam', 'NL'], ['Rotterdam', 'NL'], ['The Hague', 'NL'], ['Utrecht', 'NL'],
  ['Brussels', 'BE'], ['Bruxelles', 'BE'], ['Antwerp', 'BE'], ['Antwerpen', 'BE'], ['Bruges', 'BE'], ['Brugge', 'BE'], ['Ghent', 'BE'], ['Gent', 'BE'],
  ['Luxembourg City', 'LU'],
  ['Zurich', 'CH'], ['Zürich', 'CH'], ['Geneva', 'CH'], ['Genève', 'CH'], ['Basel', 'CH'], ['Bern', 'CH'], ['Lucerne', 'CH'], ['Interlaken', 'CH'], ['Zermatt', 'CH'],
  ['Vienna', 'AT'], ['Wien', 'AT'], ['Salzburg', 'AT'], ['Innsbruck', 'AT'],
  ['Prague', 'CZ'], ['Praha', 'CZ'], ['Budapest', 'HU'], ['Warsaw', 'PL'], ['Krakow', 'PL'], ['Kraków', 'PL'], ['Gdansk', 'PL'],
  ['Copenhagen', 'DK'], ['Stockholm', 'SE'], ['Gothenburg', 'SE'], ['Oslo', 'NO'], ['Bergen', 'NO'], ['Tromsø', 'NO'], ['Tromso', 'NO'], ['Helsinki', 'FI'], ['Rovaniemi', 'FI'], ['Lapland', 'FI'], ['Reykjavik', 'IS'],
  ['Athens', 'GR'], ['Santorini', 'GR'], ['Mykonos', 'GR'], ['Crete', 'GR'], ['Rhodes', 'GR'], ['Corfu', 'GR'], ['Thessaloniki', 'GR'],
  ['Istanbul', 'TR'], ['Antalya', 'TR'], ['Cappadocia', 'TR'], ['Bodrum', 'TR'], ['Izmir', 'TR'], ['Ankara', 'TR'],
  ['Dubrovnik', 'HR'], ['Split', 'HR'], ['Zagreb', 'HR'], ['Ljubljana', 'SI'], ['Bled', 'SI'], ['Belgrade', 'RS'], ['Sarajevo', 'BA'], ['Kotor', 'ME'], ['Tirana', 'AL'], ['Skopje', 'MK'],
  ['Bucharest', 'RO'], ['Sofia', 'BG'], ['Valletta', 'MT'], ['Malta', 'MT'], ['Nicosia', 'CY'], ['Paphos', 'CY'], ['Larnaca', 'CY'],
  ['Tallinn', 'EE'], ['Riga', 'LV'], ['Vilnius', 'LT'], ['Kyiv', 'UA'], ['Monaco', 'MC'], ['Monte Carlo', 'MC'],
  // North America
  ['New York', 'US'], ['NYC', 'US'], ['Los Angeles', 'US'], ['LA', 'US'], ['San Francisco', 'US'], ['Las Vegas', 'US'], ['Miami', 'US'], ['Orlando', 'US'], ['Chicago', 'US'], ['Boston', 'US'], ['Washington', 'US'], ['Seattle', 'US'], ['San Diego', 'US'], ['Hawaii', 'US'], ['Honolulu', 'US'], ['New Orleans', 'US'], ['Austin', 'US'], ['Dallas', 'US'], ['Houston', 'US'], ['Nashville', 'US'], ['Denver', 'US'], ['Atlanta', 'US'], ['Philadelphia', 'US'], ['Phoenix', 'US'], ['Alaska', 'US'],
  ['Toronto', 'CA'], ['Vancouver', 'CA'], ['Montreal', 'CA'], ['Montréal', 'CA'], ['Quebec City', 'CA'], ['Calgary', 'CA'], ['Banff', 'CA'], ['Ottawa', 'CA'],
  ['Mexico City', 'MX'], ['Cancun', 'MX'], ['Cancún', 'MX'], ['Tulum', 'MX'], ['Playa del Carmen', 'MX'], ['Cabo', 'MX'], ['Guadalajara', 'MX'], ['Oaxaca', 'MX'],
  // Caribbean and Latin America
  ['Havana', 'CU'], ['Punta Cana', 'DO'], ['Santo Domingo', 'DO'], ['Kingston', 'JM'], ['Montego Bay', 'JM'], ['San Juan', 'PR'], ['Nassau', 'BS'], ['Bridgetown', 'BB'], ['Aruba', 'AW'], ['Curaçao', 'CW'], ['Curacao', 'CW'],
  ['Bogotá', 'CO'], ['Bogota', 'CO'], ['Medellín', 'CO'], ['Medellin', 'CO'], ['Cartagena', 'CO'],
  ['Lima', 'PE'], ['Cusco', 'PE'], ['Machu Picchu', 'PE'], ['Quito', 'EC'], ['Galápagos', 'EC'], ['Galapagos', 'EC'], ['La Paz', 'BO'],
  ['Santiago', 'CL'], ['Patagonia', 'AR'], ['Buenos Aires', 'AR'], ['Mendoza', 'AR'], ['Montevideo', 'UY'],
  ['Rio de Janeiro', 'BR'], ['Rio', 'BR'], ['São Paulo', 'BR'], ['Sao Paulo', 'BR'], ['Salvador', 'BR'], ['Florianópolis', 'BR'],
  ['San José', 'CR'], ['San Jose', 'CR'], ['Panama City', 'PA'], ['Guatemala City', 'GT'], ['Antigua Guatemala', 'GT'], ['Belize City', 'BZ'],
  // Asia-Pacific
  ['Tokyo', 'JP'], ['Osaka', 'JP'], ['Kyoto', 'JP'], ['Hokkaido', 'JP'], ['Sapporo', 'JP'], ['Okinawa', 'JP'], ['Hiroshima', 'JP'], ['Nara', 'JP'], ['Fukuoka', 'JP'], ['Nagoya', 'JP'],
  ['Seoul', 'KR'], ['Busan', 'KR'], ['Jeju', 'KR'],
  ['Beijing', 'CN'], ['Shanghai', 'CN'], ['Guangzhou', 'CN'], ['Shenzhen', 'CN'], ['Chengdu', 'CN'], ['Hong Kong', 'HK'], ['Macau', 'MO'], ['Taipei', 'TW'],
  ['Bangkok', 'TH'], ['Phuket', 'TH'], ['Chiang Mai', 'TH'], ['Koh Samui', 'TH'], ['Krabi', 'TH'], ['Pattaya', 'TH'],
  ['Hanoi', 'VN'], ['Ho Chi Minh City', 'VN'], ['Saigon', 'VN'], ['Da Nang', 'VN'], ['Hoi An', 'VN'], ['Ha Long', 'VN'],
  ['Bali', 'ID'], ['Jakarta', 'ID'], ['Lombok', 'ID'], ['Ubud', 'ID'],
  ['Singapore', 'SG'], ['Kuala Lumpur', 'MY'], ['Penang', 'MY'], ['Langkawi', 'MY'], ['Manila', 'PH'], ['Cebu', 'PH'], ['Boracay', 'PH'], ['Palawan', 'PH'],
  ['Siem Reap', 'KH'], ['Phnom Penh', 'KH'], ['Luang Prabang', 'LA'], ['Vientiane', 'LA'], ['Yangon', 'MM'],
  ['Delhi', 'IN'], ['New Delhi', 'IN'], ['Mumbai', 'IN'], ['Goa', 'IN'], ['Bangalore', 'IN'], ['Jaipur', 'IN'], ['Agra', 'IN'], ['Kerala', 'IN'], ['Chennai', 'IN'], ['Kolkata', 'IN'],
  ['Kathmandu', 'NP'], ['Colombo', 'LK'], ['Malé', 'MV'], ['Male', 'MV'], ['Maldives', 'MV'], ['Dhaka', 'BD'], ['Karachi', 'PK'], ['Lahore', 'PK'], ['Islamabad', 'PK'],
  ['Sydney', 'AU'], ['Melbourne', 'AU'], ['Brisbane', 'AU'], ['Perth', 'AU'], ['Gold Coast', 'AU'], ['Cairns', 'AU'], ['Adelaide', 'AU'],
  ['Auckland', 'NZ'], ['Queenstown', 'NZ'], ['Wellington', 'NZ'], ['Christchurch', 'NZ'], ['Fiji', 'FJ'], ['Nadi', 'FJ'], ['Tahiti', 'PF'], ['Bora Bora', 'PF'],
  // Middle East and Central Asia
  ['Dubai', 'AE'], ['Abu Dhabi', 'AE'], ['Doha', 'QA'], ['Riyadh', 'SA'], ['Jeddah', 'SA'], ['Mecca', 'SA'], ['Makkah', 'SA'], ['Medina', 'SA'], ['Madinah', 'SA'],
  ['Muscat', 'OM'], ['Manama', 'BH'], ['Kuwait City', 'KW'], ['Amman', 'JO'], ['Petra', 'JO'], ['Tel Aviv', 'IL'], ['Jerusalem', 'IL'], ['Beirut', 'LB'],
  ['Tbilisi', 'GE'], ['Batumi', 'GE'], ['Yerevan', 'AM'], ['Baku', 'AZ'], ['Almaty', 'KZ'], ['Astana', 'KZ'], ['Tashkent', 'UZ'], ['Samarkand', 'UZ'],
  // Africa
  ['Marrakech', 'MA'], ['Marrakesh', 'MA'], ['Casablanca', 'MA'], ['Fes', 'MA'], ['Agadir', 'MA'], ['Tangier', 'MA'],
  ['Cairo', 'EG'], ['Luxor', 'EG'], ['Hurghada', 'EG'], ['Sharm el Sheikh', 'EG'], ['Tunis', 'TN'], ['Djerba', 'TN'],
  ['Cape Town', 'ZA'], ['Johannesburg', 'ZA'], ['Durban', 'ZA'], ['Kruger', 'ZA'],
  ['Nairobi', 'KE'], ['Mombasa', 'KE'], ['Zanzibar', 'TZ'], ['Dar es Salaam', 'TZ'], ['Kilimanjaro', 'TZ'], ['Arusha', 'TZ'],
  ['Kigali', 'RW'], ['Kampala', 'UG'], ['Addis Ababa', 'ET'], ['Lagos', 'NG'], ['Abuja', 'NG'], ['Accra', 'GH'], ['Dakar', 'SN'],
  ['Mauritius', 'MU'], ['Seychelles', 'SC'], ['Victoria Falls', 'ZW'], ['Windhoek', 'NA'],
];
