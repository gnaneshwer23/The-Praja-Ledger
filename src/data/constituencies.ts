import type { Source } from "./ledger";

export type ReservationCategory = "General" | "SC" | "ST";

export type Seat = {
  id: string;
  kind: "AC" | "PC";
  number: number;
  name: string;
  reservationCategory?: ReservationCategory;
  memberName: string;
  party: string;
  leaderSlug?: string;
  votes?: number;
  margin?: number;
  sources: Source[];
};

const assemblyMembers: Source = {
  title: "Members of the Legislative Assembly",
  publisher: "Government of Telangana",
  date: "Read 25 October 2026",
  url: "https://www.telangana.gov.in/legislature/members-of-legislative-assembly/",
};

const assemblyResults: Source = {
  title: "Detailed results, Telangana Legislative Assembly election 2023",
  publisher: "Election Commission of India",
  date: "2023",
  url: "https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/Detailed_Results.pdf",
};

const assemblyHighlight: Source = {
  title: "Highlights, Telangana Legislative Assembly election 2023",
  publisher: "Election Commission of India",
  date: "2023",
  url: "https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/Highlight.pdf",
};

const lokSabhaBjp: Source = {
  title: "Winning candidates, Bharatiya Janata Party, Telangana",
  publisher: "Election Commission of India",
  date: "June 2024",
  url: "https://results.eci.gov.in/PcResultGenJune2024/partywisewinresult-369S29.htm",
};

const lokSabhaInc: Source = {
  title: "Winning candidates, Indian National Congress, Telangana",
  publisher: "Election Commission of India",
  date: "June 2024",
  url: "https://results.eci.gov.in/PcResultGenJune2024/partywisewinresult-742S29.htm",
};

const lokSabhaState: Source = {
  title: "Constituency trends, Telangana, Lok Sabha election 2024",
  publisher: "Election Commission of India",
  date: "June 2024",
  url: "https://results.eci.gov.in/PcResultGenJune2024/statewiseS291.htm",
};

const lokSabhaPortal: Source = {
  title: "Members of Lok Sabha",
  publisher: "Government of Telangana",
  date: "Read 25 October 2026",
  url: "https://www.telangana.gov.in/government/mps-rs-ls/",
};

const assemblySources = [assemblyMembers, assemblyResults, assemblyHighlight];

export function seatId(kind: "ac" | "pc", name: string) {
  const base = name
    .toLowerCase()
    .replace(/\((?:sc|st)\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${kind}-${base}`;
}

function ac(
  number: number,
  name: string,
  reservationCategory: ReservationCategory,
  memberName: string,
  party: string,
  leaderSlug?: string,
): Seat {
  return {
    id: seatId("ac", name),
    kind: "AC",
    number,
    name,
    reservationCategory,
    memberName,
    party,
    leaderSlug,
    sources: assemblySources,
  };
}

function pc(
  number: number,
  name: string,
  memberName: string,
  party: string,
  result: Source,
  votes?: number,
  margin?: number,
  leaderSlug?: string,
): Seat {
  return {
    id: seatId("pc", name),
    kind: "PC",
    number,
    name,
    memberName,
    party,
    leaderSlug,
    votes,
    margin,
    sources: [result, lokSabhaPortal],
  };
}

export const seats: Seat[] = [
  ac(1, "Sirpur", "General", "Dr. Palvai Harish Babu", "BJP"),
  ac(2, "Chennur (SC)", "SC", "Vivek Venkat Swamy", "INC"),
  ac(3, "Bellampalli (SC)", "SC", "Gaddam Vinod", "INC"),
  ac(4, "Mancherial", "General", "Kokkirala Premsagar Rao", "INC"),
  ac(5, "Asifabad (ST)", "ST", "Kova Laxmi", "BRS"),
  ac(6, "Khanapur (ST)", "ST", "Vedma. Bhojju", "INC"),
  ac(7, "Adilabad", "General", "Payal Shanker", "BJP"),
  ac(8, "Boath (ST)", "ST", "Anil Jadhav", "BRS"),
  ac(9, "Nirmal", "General", "Alleti Maheshwar Reddy", "BJP"),
  ac(10, "Mudhole", "General", "Ram Rao Pawar", "BJP"),
  ac(11, "Armur", "General", "Paidi Rakesh Reddy", "BJP"),
  ac(12, "Bodhan", "General", "P. Sudarshan Reddy", "INC"),
  ac(13, "Jukkal (SC)", "SC", "Laxmi Kantha Rao Thota", "INC"),
  ac(14, "Banswada", "General", "Srinivas Reddy Parige (Pocharam)", "BRS"),
  ac(15, "Yellareddy", "General", "Madan Mohan Rao. K", "INC"),
  ac(16, "Kamareddy", "General", "Katipally Venkata Ramana Reddy", "BJP"),
  ac(17, "Nizamabad (Urban)", "General", "Dhanpal Suryanarayana", "BJP"),
  ac(18, "Nizamabad (Rural)", "General", "Bhoopathi Reddy Rekulapally", "INC"),
  ac(19, "Balkonda", "General", "Prashanth Reddy Vemula", "BRS"),
  ac(20, "Koratla", "General", "Kalvakuntla Sanjay", "BRS"),
  ac(21, "Jagtial", "General", "Dr. Sanjay", "BRS"),
  ac(22, "Dharmapuri (SC)", "SC", "Adluri Laxman Kumar", "INC"),
  ac(23, "Ramagundam", "General", "Makkan Singh Raj Thakur", "INC"),
  ac(24, "Manthani", "General", "Duddilla Sridhar Babu", "INC"),
  ac(25, "Peddapalle", "General", "Chinthakunta Vijaya Ramana Rao", "INC"),
  ac(26, "Karimnagar", "General", "Gangula Kamalakar", "BRS"),
  ac(27, "Choppadandi (SC)", "SC", "Medipally Sathyam", "INC"),
  ac(28, "Vemulawada", "General", "Aadi Srinivas", "INC"),
  ac(29, "Sircilla", "General", "Kalvakuntla Taraka Rama Rao (K.T.R)", "BRS", "k-t-rama-rao"),
  ac(30, "Manakondur (SC)", "SC", "Dr. Kavvampally Satyanarayana", "INC"),
  ac(31, "Huzurabad", "General", "Kaushik Reddy Padi", "BRS"),
  ac(32, "Husnabad", "General", "Ponnam Prabhakar", "INC"),
  ac(33, "Siddipet", "General", "Thanneeru Harish Rao", "BRS", "t-harish-rao"),
  ac(34, "Medak", "General", "Mynampally Rohith", "INC"),
  ac(35, "Narayankhed", "General", "Patlolla Sanjeeva Reddy", "INC"),
  ac(36, "Andole (SC)", "SC", "C. Damodar Rajanarsimha", "INC"),
  ac(37, "Narsapur", "General", "Vakiti Sunitha Laxma Reddy", "BRS"),
  ac(38, "Zahirabad (SC)", "SC", "Koninty Manik Rao", "BRS"),
  ac(39, "Sangareddy", "General", "Chinta Prabhakar", "BRS"),
  ac(40, "Patancheru", "General", "Gudem Mahipal Reddy", "BRS"),
  ac(41, "Dubbak", "General", "Kotta Prabhakar Reddy", "BRS"),
  ac(42, "Gajwel", "General", "Kalvakuntla Chandrashekar Rao", "BRS", "k-chandrashekar-rao"),
  ac(43, "Medchal", "General", "Chamakura Malla Reddy", "BRS"),
  ac(44, "Malkajgiri", "General", "Marri Rajashekar Reddy", "BRS"),
  ac(45, "Quthbullapur", "General", "K.P. Vivekanand", "BRS"),
  ac(46, "Kukatpalle", "General", "Madhavaram Krishna Rao", "BRS"),
  ac(47, "Uppal", "General", "Bandari Lakshma Reddy", "BRS"),
  ac(48, "Ibrahimpatnam", "General", "Malreddy Ranga Reddy", "INC"),
  ac(49, "Lal Bahadur Nagar", "General", "Devireddy Sudhir Reddy", "BRS"),
  ac(50, "Maheswaram", "General", "Patlolla Sabttha Indra Reddy", "BRS"),
  ac(51, "Rajendranagar", "General", "T. Prakash Goud", "BRS"),
  ac(52, "Serilingampally", "General", "Arekapudi Gandhi", "BRS"),
  ac(53, "Chevella (SC)", "SC", "Kale Yadaiah", "BRS"),
  ac(54, "Pargi", "General", "Dr. T. Ram Mohan Reddy", "INC"),
  ac(55, "Vicarabad (SC)", "SC", "Gaddam Prasad Kumar", "INC"),
  ac(56, "Tandur", "General", "B. Manohar Reddy", "INC"),
  ac(57, "Musheerabad", "General", "Muta Gopal", "BRS"),
  ac(58, "Malakpet", "General", "Ahmed Bin Abdullah Balala", "AIMIM"),
  ac(59, "Amberpet", "General", "Kaleru Venkatesh", "BRS"),
  ac(60, "Khairatabad", "General", "Danam Nagender", "BRS", "danam-nagender"),
  ac(61, "Jubilee Hills", "General", "Naveen Yadav. V", "INC"),
  ac(62, "Sanathnagar", "General", "Talasani Srinivas Yadav", "BRS"),
  ac(63, "Nampally", "General", "Mohammed Majid Hussain", "AIMIM"),
  ac(64, "Karwan", "General", "Kausar Mohiuddin", "AIMIM"),
  ac(65, "Goshamahal", "General", "T. Raja Singh", "BJP"),
  ac(66, "Charminar", "General", "Mir Zulfeqar Ali", "AIMIM"),
  ac(67, "Chandrayangutta", "General", "Akbar Uddin Owaisi", "AIMIM", "akbaruddin-owaisi"),
  ac(68, "Yakutpura", "General", "Jaffar Hussain", "AIMIM"),
  ac(69, "Bahadurpura", "General", "Mohammed Mubeen", "AIMIM"),
  ac(70, "Secunderabad", "General", "Padma Rao. T", "BRS"),
  ac(71, "Secunderabad Cantt. (SC)", "SC", "Narayanan Sri Ganesh", "INC"),
  ac(72, "Kodangal", "General", "Anumula Revanth Reddy", "INC", "revanth-reddy"),
  ac(73, "Narayanpet", "General", "Chittem Parnika Reddy", "INC"),
  ac(74, "Mahbubnagar", "General", "Yennam Srinivas Reddy", "INC"),
  ac(75, "Jadcherla", "General", "Anirudh Reddy Janampalli", "INC"),
  ac(76, "Devarkadra", "General", "Gavinolla Madhusudan Reddy (Gmr)", "INC"),
  ac(77, "Makthal", "General", "Vakiti Srihari", "INC"),
  ac(78, "Wanaparthy", "General", "Megha Reddy Tudi", "INC"),
  ac(79, "Gadwal", "General", "Bandla Krishna Mohan Reddy", "BRS"),
  ac(80, "Alampur (SC)", "SC", "Vijayudu", "BRS"),
  ac(81, "Nagarkurnool", "General", "Dr. Kuch Kulla Rajesh Reddy", "INC"),
  ac(82, "Achampet (SC)", "SC", "Chikkudu Vamshi Krishna", "INC"),
  ac(83, "Kalwakurthy", "General", "Kasireddy Narayan Reddy", "INC"),
  ac(84, "Shadnagar", "General", "K Shankaraiah", "INC"),
  ac(85, "Kollapur", "General", "Jupally Krishna Rao", "INC"),
  ac(86, "Devarakonda (ST)", "ST", "Balu Naik Nenavath", "INC"),
  ac(87, "Nagarjuna Sagar", "General", "Kunduru Jayaveer", "INC"),
  ac(88, "Miryalaguda", "General", "Bathula Laxma Reddy", "INC"),
  ac(89, "Huzurnagar", "General", "Uttam Kumar Reddy Nalamada", "INC"),
  ac(90, "Kodad", "General", "Nalamada Padmavathi Reddy", "INC"),
  ac(91, "Suryapet", "General", "Guntakandla Jagadish Reddy", "BRS"),
  ac(92, "Nalgonda", "General", "Komati Reddy Venkat Reddy", "INC"),
  ac(93, "Munugode", "General", "Komatireddy Raj Gopal Reddy", "INC"),
  ac(94, "Bhongir", "General", "Kumbam Anil Kumar Reddy", "INC"),
  ac(95, "Nakrekal (SC)", "SC", "Vemula Veeresham", "INC"),
  ac(96, "Thungathurthi (SC)", "SC", "Mandula Samel", "INC"),
  ac(97, "Alair", "General", "Ilaiah Beerla", "INC"),
  ac(98, "Jangoan", "General", "Palla Rajeshwar Reddy", "BRS"),
  ac(99, "Ghanpur (Station) (SC)", "SC", "Kadiyam Srihari", "BRS"),
  ac(100, "Palakurthi", "General", "Yashaswini Mamidala", "INC"),
  ac(101, "Dornakal (ST)", "ST", "Jatoth Ram Chander Naik", "INC"),
  ac(102, "Mahabubabad (ST)", "ST", "Dr. Murali Naik Bhukya", "INC"),
  ac(103, "Narsampet", "General", "Donthi Madhava Reddy", "INC"),
  ac(104, "Parkal", "General", "Revuri Prakash Reddy", "INC"),
  ac(105, "Warangal West", "General", "Naini Rajender Reddy", "INC"),
  ac(106, "Warangal East", "General", "Konda Surekha", "INC"),
  ac(107, "Waradhanapet (SC)", "SC", "K.R. Nagaraj. K", "INC"),
  ac(108, "Bhupalpalle", "General", "Gandra Satyanarayana Rao", "INC"),
  ac(109, "Mulug (ST)", "ST", "Anasuya Seethakka Dansari", "INC"),
  ac(110, "Pinapaka (ST)", "ST", "Payam Venkateswarulu", "INC"),
  ac(111, "Yellandu (ST)", "ST", "Koram Kanakaiah", "INC"),
  ac(112, "Khammam", "General", "Tummala Nageswara Rao", "INC"),
  ac(113, "Palair", "General", "Ponguleti Srinivasa Reddy", "INC"),
  ac(114, "Madhira (SC)", "SC", "Bhatti Vikramarka Mallu", "INC", "bhatti-vikramarka-mallu"),
  ac(115, "Wyra (ST)", "ST", "Ramdas Maloth", "INC"),
  ac(116, "Sathupalle (SC)", "SC", "Matta Ragamayee", "INC"),
  ac(117, "Kothagudem", "General", "Kunamneni Sambasiva Rao", "CPI"),
  ac(118, "Aswaraopeta (ST)", "ST", "Adinarayana Jare", "INC"),
  ac(119, "Bhadrachalam (ST)", "ST", "Dr. Tellam Venkata Rao", "BRS"),
  pc(1, "Adilabad", "Godam Nagesh", "Bharatiya Janata Party", lokSabhaBjp, 568168, 90652),
  pc(2, "Peddapalle", "Vamsi Krishna Gaddam", "Indian National Congress", lokSabhaInc, 475587, 131364),
  pc(3, "Karimnagar", "Bandi Sanjay Kumar", "Bharatiya Janata Party", lokSabhaBjp, 585116, 225209, "bandi-sanjay-kumar"),
  pc(4, "Nizamabad", "Arvind Dharmapuri", "Bharatiya Janata Party", lokSabhaBjp, 592318, 109241),
  pc(5, "Zahirabad", "Suresh Kumar Shetkar", "Indian National Congress", lokSabhaInc, 528418, 46188),
  pc(6, "Medak", "Madhavaneni Raghunandan Rao", "Bharatiya Janata Party", lokSabhaBjp, 471217, 39139),
  pc(7, "Malkajgiri", "Eatala Rajender", "Bharatiya Janata Party", lokSabhaBjp, 991042, 391475),
  pc(8, "Secunderabad", "G. Kishan Reddy", "Bharatiya Janata Party", lokSabhaBjp, 473012, 49944, "g-kishan-reddy"),
  pc(9, "Hyderabad", "Asaduddin Owaisi", "All India Majlis-E-Ittehadul Muslimeen", lokSabhaState, undefined, 338087, "asaduddin-owaisi"),
  pc(10, "Chevella", "Konda Vishweshwar Reddy", "Bharatiya Janata Party", lokSabhaBjp, 809882, 172897),
  pc(11, "Mahbubnagar", "Aruna D. K.", "Bharatiya Janata Party", lokSabhaBjp, 510747, 4500),
  pc(12, "Nagarkurnool", "Dr. Mallu Ravi", "Indian National Congress", lokSabhaInc, 465072, 94414),
  pc(13, "Nalgonda", "Kunduru Raghuveer", "Indian National Congress", lokSabhaInc, 784337, 559905),
  pc(14, "Bhongir", "Chamala Kiran Kumar Reddy", "Indian National Congress", lokSabhaInc, 629143, 222170),
  pc(15, "Warangal", "Kadiyam Kavya", "Indian National Congress", lokSabhaInc, 581294, 220339),
  pc(16, "Mahabubabad", "Balram Naik Porika", "Indian National Congress", lokSabhaInc, 612774, 349165),
  pc(17, "Khammam", "Ramasahayam Raghuram Reddy", "Indian National Congress", lokSabhaInc, 766929, 467847),
];

export function getSeat(id: string) {
  return seats.find((seat) => seat.id === id);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}
