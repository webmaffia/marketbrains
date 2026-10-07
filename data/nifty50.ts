/**
 * NIFTY 50 index and its constituent stocks. Index membership is reviewed by NSE twice a year, so check
 * this list against niftyindices.com before seeding. After that, admins add or remove communities in the app.
 */
export interface NiftyStock {
  ticker: string;
  name: string;
  sector: string;
  /** Used to fetch the company logo. */
  domain: string;
  about: string;
}

export const NIFTY_INDEX = {
  slug: "nifty-50",
  ticker: "NIFTY 50",
  name: "NIFTY 50",
  priceSymbol: "^NSEI",
  domain: "nseindia.com",
  sector: "Index",
  about: "India's benchmark equity index of 50 large companies listed on the NSE. Members discuss the market's direction, sector moves and what is driving the index.",
};

export const nifty50: NiftyStock[] = [
  { ticker: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate", domain: "adani.com", about: "Flagship of the Adani Group, incubating businesses in airports, roads, mining and new energy." },
  { ticker: "ADANIPORTS", name: "Adani Ports & SEZ", sector: "Infrastructure", domain: "adaniports.com", about: "India's largest private port operator, with growing logistics and marine services." },
  { ticker: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare", domain: "apollohospitals.com", about: "Leading hospital chain with a large pharmacy and digital health business." },
  { ticker: "ASIANPAINT", name: "Asian Paints", sector: "Consumer", domain: "asianpaints.com", about: "India's largest paints company, known for distribution reach and brand strength." },
  { ticker: "AXISBANK", name: "Axis Bank", sector: "Banking", domain: "axisbank.com", about: "Large private-sector bank with a growing retail and digital franchise." },
  { ticker: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Automobiles", domain: "bajajauto.com", about: "Two- and three-wheeler maker with a strong export business." },
  { ticker: "BAJFINANCE", name: "Bajaj Finance", sector: "Financial Services", domain: "bajajfinserv.in", about: "India's largest non-bank lender, focused on consumer and SME credit." },
  { ticker: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services", domain: "bajajfinserv.in", about: "Holding company for Bajaj's lending and insurance businesses." },
  { ticker: "BEL", name: "Bharat Electronics", sector: "Defence", domain: "bel-india.in", about: "State-owned defence electronics maker, driven by government orders." },
  { ticker: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", domain: "airtel.in", about: "Major telecom operator in India and Africa. Members follow tariffs, 5G and ARPU." },
  { ticker: "CIPLA", name: "Cipla", sector: "Pharma", domain: "cipla.com", about: "Global generics maker with strength in respiratory medicines." },
  { ticker: "COALINDIA", name: "Coal India", sector: "Mining", domain: "coalindia.in", about: "World's largest coal miner, a high-dividend state-owned company." },
  { ticker: "DRREDDY", name: "Dr. Reddy's Laboratories", sector: "Pharma", domain: "drreddys.com", about: "Global pharma company with a big US generics business." },
  { ticker: "EICHERMOT", name: "Eicher Motors", sector: "Automobiles", domain: "eichermotors.com", about: "Maker of Royal Enfield motorcycles and part of the VE Commercial Vehicles venture." },
  { ticker: "ETERNAL", name: "Eternal (Zomato)", sector: "Consumer Internet", domain: "eternal.com", about: "Parent of Zomato and Blinkit, covering food delivery and quick commerce." },
  { ticker: "GRASIM", name: "Grasim Industries", sector: "Materials", domain: "grasim.com", about: "Aditya Birla Group company in cement, chemicals and paints." },
  { ticker: "HCLTECH", name: "HCL Technologies", sector: "IT Services", domain: "hcltech.com", about: "Global IT services and engineering company." },
  { ticker: "HDFCBANK", name: "HDFC Bank", sector: "Banking", domain: "hdfcbank.com", about: "India's largest private bank. Conversation centres on deposits, credit quality and the merger." },
  { ticker: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Insurance", domain: "hdfclife.com", about: "Leading private life insurer. Members track premium growth and margins." },
  { ticker: "HINDALCO", name: "Hindalco Industries", sector: "Metals", domain: "hindalco.com", about: "Aluminium and copper producer that also owns Novelis." },
  { ticker: "HINDUNILVR", name: "Hindustan Unilever", sector: "Consumer", domain: "hul.co.in", about: "India's largest FMCG company, with household brands across food and personal care." },
  { ticker: "ICICIBANK", name: "ICICI Bank", sector: "Banking", domain: "icicibank.com", about: "Large private bank known for strong returns and digital banking." },
  { ticker: "INDIGO", name: "InterGlobe Aviation (IndiGo)", sector: "Aviation", domain: "goindigo.in", about: "India's largest airline by market share." },
  { ticker: "INFY", name: "Infosys", sector: "IT Services", domain: "infosys.com", about: "Global IT services and consulting. Members follow guidance, margins and large deals." },
  { ticker: "ITC", name: "ITC", sector: "Consumer", domain: "itcportal.com", about: "Cigarettes, FMCG, hotels and agri business under one roof." },
  { ticker: "JIOFIN", name: "Jio Financial Services", sector: "Financial Services", domain: "jiofinance.com", about: "Financial services arm demerged from Reliance." },
  { ticker: "JSWSTEEL", name: "JSW Steel", sector: "Metals", domain: "jsw.in", about: "One of India's largest steel makers." },
  { ticker: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", domain: "kotak.com", about: "Private bank with a strong wealth and asset management franchise." },
  { ticker: "LT", name: "Larsen & Toubro", sector: "Infrastructure", domain: "larsentoubro.com", about: "Engineering and construction major, with a large order book." },
  { ticker: "M&M", name: "Mahindra & Mahindra", sector: "Automobiles", domain: "mahindra.com", about: "Leader in SUVs and tractors with a growing EV plan." },
  { ticker: "MARUTI", name: "Maruti Suzuki", sector: "Automobiles", domain: "marutisuzuki.com", about: "India's largest carmaker by volume." },
  { ticker: "MAXHEALTH", name: "Max Healthcare Institute", sector: "Healthcare", domain: "maxhealthcare.in", about: "Premium hospital network in north and west India." },
  { ticker: "NESTLEIND", name: "Nestle India", sector: "Consumer", domain: "nestle.in", about: "Maker of Maggi, KitKat and Nescafe in India." },
  { ticker: "NTPC", name: "NTPC", sector: "Power", domain: "ntpc.co.in", about: "India's largest power generator, expanding in renewables." },
  { ticker: "ONGC", name: "Oil & Natural Gas Corporation", sector: "Oil & Gas", domain: "ongcindia.com", about: "State-owned oil and gas explorer. Crude prices drive the story." },
  { ticker: "POWERGRID", name: "Power Grid Corporation", sector: "Power", domain: "powergrid.in", about: "Operates most of India's power transmission network." },
  { ticker: "RELIANCE", name: "Reliance Industries", sector: "Conglomerate", domain: "ril.com", about: "Diversified group across energy, retail, telecom and new energy." },
  { ticker: "SBILIFE", name: "SBI Life Insurance", sector: "Insurance", domain: "sbilife.co.in", about: "Large private life insurer backed by State Bank of India." },
  { ticker: "SBIN", name: "State Bank of India", sector: "Banking", domain: "sbi.co.in", about: "India's largest public-sector bank." },
  { ticker: "SHRIRAMFIN", name: "Shriram Finance", sector: "Financial Services", domain: "shriramfinance.in", about: "Lender focused on commercial vehicles and small businesses." },
  { ticker: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", domain: "sunpharma.com", about: "India's largest pharma company, with a growing specialty portfolio." },
  { ticker: "TATACONSUMER", name: "Tata Consumer Products", sector: "Consumer", domain: "tataconsumer.com", about: "Tea, salt and food brands including Tata Tea and Tata Salt." },
  { ticker: "TATAMOTORS", name: "Tata Motors", sector: "Automobiles", domain: "tatamotors.com", about: "Passenger and commercial vehicles, plus Jaguar Land Rover." },
  { ticker: "TATASTEEL", name: "Tata Steel", sector: "Metals", domain: "tatasteel.com", about: "Global steel maker with operations in India, the UK and Europe." },
  { ticker: "TCS", name: "Tata Consultancy Services", sector: "IT Services", domain: "tcs.com", about: "India's largest IT services company. Members discuss deals, attrition and AI." },
  { ticker: "TECHM", name: "Tech Mahindra", sector: "IT Services", domain: "techmahindra.com", about: "IT and telecom services company turning around its margins." },
  { ticker: "TITAN", name: "Titan Company", sector: "Consumer", domain: "titancompany.in", about: "Jewellery, watches and eyewear, led by Tanishq." },
  { ticker: "TRENT", name: "Trent", sector: "Retail", domain: "trentlimited.com", about: "Tata Group retailer behind Westside and Zudio." },
  { ticker: "ULTRACEMCO", name: "UltraTech Cement", sector: "Materials", domain: "ultratechcement.com", about: "India's largest cement maker." },
  { ticker: "WIPRO", name: "Wipro", sector: "IT Services", domain: "wipro.com", about: "Global IT services and consulting company." },
];

/** Stocks shown in the "Popular" rail on Discover, along with the index. */
export const FEATURED = new Set(["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN"]);
