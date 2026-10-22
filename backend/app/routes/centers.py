import math
from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/centers", tags=["Centers"])

# Comprehensive dataset of physical centers across Indian states
CENTERS_DATABASE = [
    {
        "id": "mah_csc_01",
        "name": "Maha e-Seva Kendra (CSC) \u2014 Shivaji Nagar",
        "center_type": "Maha e-Seva Kendra",
        "category": "csc",
        "state": "Maharashtra",
        "district": "Pune",
        "pincode": "411005",
        "address": "Shop No. 4, Municipal Complex, Near Shivaji Nagar Bus Stand, Pune, Maharashtra 411005",
        "contact_person": "District e-Governance Society (DeGS) Pune",
        "phone": "020-25531100",
        "email": "shivajinagar.eseva@maharashtra.gov.in",
        "operating_hours": "09:30 AM \u2013 06:30 PM (Mon\u2013Sat)",
        "lat": 18.5314,
        "lng": 73.8446,
        "verified": True,
        "services": [
            "Aadhaar Enrollment & Update",
            "Income & Caste Certificate (e-District)",
            "PM-KISAN e-KYC & Registration",
            "Ayushman Bharat PMJAY Card",
            "MahaDBT Scholarship Applications",
            "Ration Card (PDS) Services"
        ]
    },
    {
        "id": "mah_teh_01",
        "name": "Tehsildar & Taluka Magistrate Office \u2014 Pune City",
        "center_type": "Tehsildar Office",
        "category": "government_office",
        "state": "Maharashtra",
        "district": "Pune",
        "pincode": "411001",
        "address": "Revenue Complex, Near Sassoon Hospital, Pune Station Road, Pune, Maharashtra 411001",
        "contact_person": "Taluka Revenue Officer",
        "phone": "020-26123456",
        "email": "tehsildar.pune@maharashtra.gov.in",
        "operating_hours": "10:00 AM \u2013 05:30 PM (Mon\u2013Fri)",
        "lat": 18.5204,
        "lng": 73.8567,
        "verified": True,
        "services": [
            "Domicile & Non-Creamy Layer Certificates",
            "Land Record (7/12 & 8A) Verification",
            "Disability & Senior Citizen Pensions",
            "Aaple Sarkar Grievance Redressal"
        ]
    },
    {
        "id": "mah_csc_02",
        "name": "Common Service Center (CSC) \u2014 Dadar West",
        "center_type": "Common Service Center (CSC)",
        "category": "csc",
        "state": "Maharashtra",
        "district": "Mumbai",
        "pincode": "400028",
        "address": "Gala No. 12, Senapati Bapat Marg, Near Dadar Railway Station (West), Mumbai, Maharashtra 400028",
        "contact_person": "District e-Governance Society (DeGS) Mumbai",
        "phone": "022-24301122",
        "email": "dadar.csc@csc.gov.in",
        "operating_hours": "09:00 AM \u2013 07:00 PM (Mon\u2013Sat)",
        "lat": 19.0178,
        "lng": 72.8478,
        "verified": True,
        "services": [
            "PM SVANidhi Application Assistance",
            "PM Vishwakarma Biometric Verification",
            "PAN & Voter ID Card Services",
            "E-Shram Card Registration",
            "Aadhaar Update & KYC"
        ]
    },
    {
        "id": "del_csc_01",
        "name": "Delhi Govt Seva Kendra \u2014 Connaught Place",
        "center_type": "Seva Kendra",
        "category": "government_office",
        "state": "Delhi",
        "district": "New Delhi",
        "pincode": "110001",
        "address": "Palika Kendra, Sansad Marg, Near Rajiv Chowk Metro Station, Connaught Place, New Delhi 110001",
        "contact_person": "NDMC Citizen Facilitation Center",
        "phone": "011-23340011",
        "email": "ndmc.sevakendra@delhi.gov.in",
        "operating_hours": "09:00 AM \u2013 05:30 PM (Mon\u2013Sat)",
        "lat": 28.6304,
        "lng": 77.2177,
        "verified": True,
        "services": [
            "e-District Delhi Certificate Verification",
            "Delhi Ladli Scheme Registration",
            "Construction Worker Board Benefits",
            "Ayushman PM-JAY Assistance"
        ]
    },
    {
        "id": "del_csc_02",
        "name": "CSC Digital Seva Point \u2014 Rohini Sector 7",
        "center_type": "Common Service Center (CSC)",
        "category": "csc",
        "state": "Delhi",
        "district": "North West Delhi",
        "pincode": "110085",
        "address": "Shop 14, DDA Market, Sector 7, Rohini, New Delhi 110085",
        "contact_person": "District e-Governance Society North West Delhi",
        "phone": "011-27041122",
        "email": "rohini.csc@digitalindia.gov.in",
        "operating_hours": "09:30 AM \u2013 08:00 PM (Mon\u2013Sat)",
        "lat": 28.7041,
        "lng": 77.1025,
        "verified": True,
        "services": [
            "PM Vishwakarma Scheme Apply",
            "E-Shram & Pension Portal Registration",
            "Income & Caste Certificate Apply",
            "Electricity Subsidy & Water Bill Linking"
        ]
    },
    {
        "id": "up_csc_01",
        "name": "Jan Seva Kendra (CSC) \u2014 Hazratganj",
        "center_type": "Jan Seva Kendra",
        "category": "csc",
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "pincode": "226001",
        "address": "Commercial Complex, MG Marg, Near Hazratganj Crossing, Lucknow, Uttar Pradesh 226001",
        "contact_person": "District e-Governance Society Lucknow",
        "phone": "0522-2288111",
        "email": "lucknow.janseva@up.gov.in",
        "operating_hours": "09:30 AM \u2013 06:00 PM (Mon\u2013Sat)",
        "lat": 26.8467,
        "lng": 80.9462,
        "verified": True,
        "services": [
            "UP Kanya Sumangala Yojana",
            "PM-KISAN Samman Nidhi Verification",
            "Ayushman Card Golden Print",
            "UP Scholarship & Fee Reimbursement",
            "Old Age & Widow Pension"
        ]
    },
    {
        "id": "up_welfare_01",
        "name": "District Social Welfare Office \u2014 Vikas Bhawan",
        "center_type": "Social Welfare Office",
        "category": "government_office",
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "pincode": "226020",
        "address": "Vikas Bhawan, Near Collectorate, KGMU Road, Lucknow, Uttar Pradesh 226020",
        "contact_person": "District Social Welfare Officer",
        "phone": "0522-2621122",
        "email": "dswo.lucknow@up.gov.in",
        "operating_hours": "10:00 AM \u2013 05:00 PM (Mon\u2013Fri)",
        "lat": 26.86,
        "lng": 80.92,
        "verified": True,
        "services": [
            "Post-Matric Scholarship Approvals",
            "SC/ST/OBC Grants & Subsidy Disbursals",
            "Divyangjan Pension Verification",
            "Direct Grievance Submissions"
        ]
    },
    {
        "id": "up_csc_02",
        "name": "Digital Seva Kendra (CSC) \u2014 Sector 62",
        "center_type": "Common Service Center (CSC)",
        "category": "csc",
        "state": "Uttar Pradesh",
        "district": "Gautam Buddha Nagar (Noida)",
        "pincode": "201309",
        "address": "Plot 18, Block B, Electronic City, Sector 62, Noida, Uttar Pradesh 201309",
        "contact_person": "DeGS Gautam Buddha Nagar",
        "phone": "0120-2401122",
        "email": "noida62.csc@up.gov.in",
        "operating_hours": "09:00 AM \u2013 07:00 PM (Mon\u2013Sat)",
        "lat": 28.628,
        "lng": 77.3649,
        "verified": True,
        "services": [
            "Income & Domicile e-District Applications",
            "PMAY Housing Application Assistance",
            "Mudra Loan Scheme Guidance",
            "Aadhaar Update & KYC"
        ]
    },
    {
        "id": "kar_b1_01",
        "name": "Bangalore One Citizen Center \u2014 Indiranagar",
        "center_type": "Bangalore One",
        "category": "government_office",
        "state": "Karnataka",
        "district": "Bengaluru",
        "pincode": "560038",
        "address": "100 Feet Road, Near CMH Hospital, 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
        "contact_person": "Directorate of Electronic Delivery of Citizen Services",
        "phone": "080-25201122",
        "email": "bangaloreone@karnataka.gov.in",
        "operating_hours": "08:00 AM \u2013 07:00 PM (All 7 Days)",
        "lat": 12.9784,
        "lng": 77.6408,
        "verified": True,
        "services": [
            "Gruha Lakshmi & Gruha Jyothi Scheme Registration",
            "Yuva Nidhi Scheme Application",
            "Seva Sindhu Services",
            "RTC / Pahani Bhoomi Land Records",
            "Caste & Income Certificate"
        ]
    },
    {
        "id": "kar_csc_01",
        "name": "Grama One Center \u2014 Nelamangala",
        "center_type": "Gram One (CSC)",
        "category": "csc",
        "state": "Karnataka",
        "district": "Bengaluru Rural",
        "pincode": "562123",
        "address": "Grama Panchayat Complex, Main Road, Nelamangala, Bengaluru Rural, Karnataka 562123",
        "contact_person": "District e-Governance Society Bengaluru Rural",
        "phone": "080-27725500",
        "email": "nelamangala.gramaone@karnataka.gov.in",
        "operating_hours": "09:00 AM \u2013 06:00 PM (Mon\u2013Sat)",
        "lat": 13.0998,
        "lng": 77.3918,
        "verified": True,
        "services": [
            "Raitha Siri / Farmer Subsidies",
            "PM-KISAN e-KYC & Land Seeding",
            "Pashu Bhagya Loan Processing",
            "Sandhya Suraksha Pension"
        ]
    },
    {
        "id": "tn_esevai_01",
        "name": "TNeGA e-Sevai Maiyam \u2014 T. Nagar",
        "center_type": "e-Sevai",
        "category": "csc",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "pincode": "600017",
        "address": "Corporation Shopping Complex, South Usman Road, T. Nagar, Chennai, Tamil Nadu 600017",
        "contact_person": "Tamil Nadu e-Governance Agency (TNeGA)",
        "phone": "044-24345678",
        "email": "tnega.esevai@tn.gov.in",
        "operating_hours": "09:30 AM \u2013 05:30 PM (Mon\u2013Sat)",
        "lat": 13.0418,
        "lng": 80.2341,
        "verified": True,
        "services": [
            "Kalaignar Magalir Urimai Thittam",
            "Moovalur Ramamirtham Ammaiyar Scheme (Pudhumai Penn)",
            "Community & Nativity Certificates",
            "Chief Minister's Comprehensive Health Insurance (CMCHIS)"
        ]
    },
    {
        "id": "tn_taluk_01",
        "name": "Taluk Office & Citizen Center \u2014 Guindy",
        "center_type": "Taluk Office",
        "category": "government_office",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "pincode": "600032",
        "address": "Taluk Administrative Complex, Anna Salai, Guindy, Chennai, Tamil Nadu 600032",
        "contact_person": "Tahsildar Guindy",
        "phone": "044-22501234",
        "email": "tahsildar.guindy@tn.gov.in",
        "operating_hours": "10:00 AM \u2013 05:45 PM (Mon\u2013Fri)",
        "lat": 13.0067,
        "lng": 80.2025,
        "verified": True,
        "services": [
            "First Graduate Certificate",
            "Destitute Widow Pension",
            "Legal Heir Certificate",
            "Land Patta / Chitta Transfer"
        ]
    },
    {
        "id": "guj_janseva_01",
        "name": "Digital Gujarat Jan Seva Kendra \u2014 Navrangpura",
        "center_type": "Jan Seva Kendra",
        "category": "government_office",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "pincode": "380009",
        "address": "Sub-Registrar Building, Near University Ground, Navrangpura, Ahmedabad, Gujarat 380009",
        "contact_person": "District Collectorate Citizen Facilitation Center",
        "phone": "079-26301199",
        "email": "janseva.ahmedabad@gujarat.gov.in",
        "operating_hours": "10:00 AM \u2013 06:00 PM (Mon\u2013Sat)",
        "lat": 23.0365,
        "lng": 72.5611,
        "verified": True,
        "services": [
            "Maa Vatsalya & PMJAY Ayushman Card",
            "Mukhyamantri Kisan Sahay Yojana",
            "Kanya Kelavani Education Assistance",
            "Non-Creamy Layer (NCL) Certificate"
        ]
    },
    {
        "id": "raj_emitra_01",
        "name": "e-Mitra Kendra \u2014 Mansarovar",
        "center_type": "E-Mitra",
        "category": "csc",
        "state": "Rajasthan",
        "district": "Jaipur",
        "pincode": "302020",
        "address": "Plot 45, Madhyam Marg, Mansarovar, Jaipur, Rajasthan 302020",
        "contact_person": "DoIT&C District Office Jaipur",
        "phone": "0141-2740001",
        "email": "emitra.jaipur@rajasthan.gov.in",
        "operating_hours": "09:00 AM \u2013 08:00 PM (Mon\u2013Sat)",
        "lat": 26.8524,
        "lng": 75.7683,
        "verified": True,
        "services": [
            "Chiranjeevi / Mukhyamantri Ayushman Swasthya Bima",
            "Jan Aadhaar Card Enrolment & Linking",
            "Palanhar Scheme Application",
            "Social Security Pension (SSP) Renewal"
        ]
    },
    {
        "id": "tel_meeseva_01",
        "name": "MeeSeva Center \u2014 Banjara Hills",
        "center_type": "MeeSeva",
        "category": "csc",
        "state": "Telangana",
        "district": "Hyderabad",
        "pincode": "500034",
        "address": "Road No. 12, Beside Post Office, Banjara Hills, Hyderabad, Telangana 500034",
        "contact_person": "Electronic Delivery of Citizen Services (MeeSeva)",
        "phone": "040-23385555",
        "email": "meeseva.support@telangana.gov.in",
        "operating_hours": "09:00 AM \u2013 07:00 PM (Mon\u2013Sat)",
        "lat": 17.4156,
        "lng": 78.4357,
        "verified": True,
        "services": [
            "Rythu Bandhu & Rythu Bima Verification",
            "Kalyana Lakshmi / Shaadi Mubarak",
            "Aasara Pension Registration",
            "Integrated Caste & Income Certificate"
        ]
    },
    {
        "id": "mp_lokseva_01",
        "name": "Lok Seva Kendra \u2014 MP Nagar",
        "center_type": "Lok Seva Kendra",
        "category": "csc",
        "state": "Madhya Pradesh",
        "district": "Bhopal",
        "pincode": "462011",
        "address": "Zone 1, MP Nagar, Near Chetak Bridge, Bhopal, Madhya Pradesh 462011",
        "contact_person": "Public Service Management Dept (Lok Seva)",
        "phone": "0755-2554433",
        "email": "lokseva.bhopal@mp.gov.in",
        "operating_hours": "09:30 AM \u2013 06:00 PM (Mon\u2013Sat)",
        "lat": 23.2332,
        "lng": 77.4343,
        "verified": True,
        "services": [
            "Mukhyamantri Ladli Behna Yojana",
            "Sambal 2.0 Jan Kalyan Portal Services",
            "PM-KISAN / MP Kisan Kalyan Yojana",
            "Samagra ID Update & Verification"
        ]
    },
    {
        "id": "wb_bsk_01",
        "name": "Bangla Sahayata Kendra (BSK) \u2014 Salt Lake",
        "center_type": "Bangla Sahayata Kendra",
        "category": "government_office",
        "state": "West Bengal",
        "district": "Kolkata",
        "pincode": "700064",
        "address": "Bikash Bhawan Campus, Sector 1, Salt Lake City, Kolkata, West Bengal 700064",
        "contact_person": "Personnel & Administrative Reforms Dept (BSK)",
        "phone": "033-23347788",
        "email": "bsk.kolkata@wb.gov.in",
        "operating_hours": "10:00 AM \u2013 05:30 PM (Mon\u2013Fri)",
        "lat": 22.5867,
        "lng": 88.4178,
        "verified": True,
        "services": [
            "Lakshmir Bhandar Scheme Registration",
            "Krishak Bandhu Assistance",
            "Swasthya Sathi Smart Card",
            "Kanyashree Prakalpa Application"
        ]
    },
    {
        "id": "bih_rtps_01",
        "name": "RTPS & Vasudha Kendra (CSC) \u2014 Kankarbagh",
        "center_type": "RTPS Counter / CSC",
        "category": "csc",
        "state": "Bihar",
        "district": "Patna",
        "pincode": "800020",
        "address": "Block Development Office Campus, Kankarbagh Main Road, Patna, Bihar 800020",
        "contact_person": "Right to Public Services (RTPS) Nodal Officer",
        "phone": "0612-2351122",
        "email": "patna.rtps@bihar.gov.in",
        "operating_hours": "09:30 AM \u2013 05:30 PM (Mon\u2013Sat)",
        "lat": 25.5941,
        "lng": 85.1584,
        "verified": True,
        "services": [
            "Bihar Student Credit Card Scheme",
            "Kushal Yuva Program (KYP)",
            "Mukhyamantri Kanya Utthan Yojana",
            "Caste, Income & Residential Certificates"
        ]
    },
    {
        "id": "ker_akshaya_01",
        "name": "Akshaya e-Centre \u2014 MG Road, Ernakulam",
        "center_type": "Akshaya e-Centre",
        "category": "csc",
        "state": "Kerala",
        "district": "Ernakulam",
        "pincode": "682011",
        "address": "Near Broadway Junction, MG Road, Ernakulam, Kerala 682011",
        "contact_person": "District Akshaya Project Office Ernakulam",
        "phone": "0484-2351234",
        "email": "ernakulam.akshaya@kerala.gov.in",
        "operating_hours": "09:30 AM \u2013 05:30 PM (Mon\u2013Sat)",
        "lat": 9.9816,
        "lng": 76.2999,
        "verified": True,
        "services": [
            "KSFE Chitty & Welfare Services",
            "Income/Caste Certificate (e-District Kerala)",
            "Aadhaar Enrollment & Update",
            "Life Certificate (Jeevan Pramaan)",
            "PM-KISAN e-KYC & Status Check"
        ]
    },
    {
        "id": "ap_meeseva_01",
        "name": "MeeSeva Citizen Service Center \u2014 Governorpet",
        "center_type": "MeeSeva",
        "category": "csc",
        "state": "Andhra Pradesh",
        "district": "NTR / Krishna",
        "pincode": "520002",
        "address": "Prakasam Road, Governorpet, Vijayawada, Andhra Pradesh 520002",
        "contact_person": "e-Pragati Authority Andhra Pradesh",
        "phone": "0866-2571234",
        "email": "vijayawada.meeseva@ap.gov.in",
        "operating_hours": "09:30 AM \u2013 05:30 PM (Mon\u2013Sat)",
        "lat": 16.5062,
        "lng": 80.648,
        "verified": True,
        "services": [
            "YSR Rythu Bharosa Registration",
            "Jagananna Vasathi Deevena Scheme",
            "Amma Vodi Scheme Verification",
            "Income & Caste Certificate (MeeSeva)",
            "Aadhaar Enrollment & Update"
        ]
    },
    {
        "id": "hry_saral_01",
        "name": "Antyodaya Saral Kendra \u2014 Sector 12, Karnal",
        "center_type": "Antyodaya Saral Kendra",
        "category": "government_office",
        "state": "Haryana",
        "district": "Karnal",
        "pincode": "132001",
        "address": "Mini Secretariat Complex, Sector 12, Karnal, Haryana 132001",
        "contact_person": "District Citizen Resources Information Officer",
        "phone": "0184-2267800",
        "email": "saral.karnal@hry.gov.in",
        "operating_hours": "09:00 AM \u2013 05:00 PM (Mon\u2013Fri)",
        "lat": 29.6857,
        "lng": 76.9907,
        "verified": True,
        "services": [
            "Parivar Pehchan Patra (PPP) Verification",
            "Old Age Samman Allowance",
            "Mukhyamantri Parivar Samriddhi Yojana",
            "Haryana e-District Certificates"
        ]
    },
    {
        "id": "pun_sewa_01",
        "name": "District Sewa Kendra \u2014 Phase 7, Mohali",
        "center_type": "Sewa Kendra",
        "category": "government_office",
        "state": "Punjab",
        "district": "SAS Nagar (Mohali)",
        "pincode": "160062",
        "address": "Municipal Corporation Complex, Sector 61, Phase 7, Mohali, Punjab 160062",
        "contact_person": "Department of Governance Reforms Punjab",
        "phone": "0172-2270022",
        "email": "sewakendra.mohali@punjab.gov.in",
        "operating_hours": "09:00 AM \u2013 05:00 PM (Mon\u2013Sat)",
        "lat": 30.7046,
        "lng": 76.7179,
        "verified": True,
        "services": [
            "Aashirwad Scheme Verification",
            "Atta Dal Scheme (PDS) Registration",
            "Residence & Income Certificate (e-Sewa)",
            "Divyangjan Disability Identity Card"
        ]
    }
]

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points on the earth."""
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


@router.get("/")
async def get_centers(
    state: Optional[str] = Query(None, description="State name"),
    district: Optional[str] = Query(None, description="District name"),
    pincode: Optional[str] = Query(None, description="6-digit pincode"),
    center_type: Optional[str] = Query(None, description="Type of center (e.g. csc, government_office)"),
    search: Optional[str] = Query(None, description="Free text search query"),
    lat: Optional[float] = Query(None, description="User current latitude"),
    lng: Optional[float] = Query(None, description="User current longitude"),
    limit: int = Query(35, ge=1, le=100)
):
    """
    Search and filter physical citizen service centers (CSC, MeeSeva, Tehsildar Office, etc.)
    with distance calculation if user coordinates are provided.
    """
    results = []
    
    for c in CENTERS_DATABASE:
        # Match state
        if state and state.lower() != "all" and c["state"].lower() != state.lower():
            continue
            
        # Match district
        if district and district.lower() != "all" and c["district"].lower() != district.lower():
            continue
            
        # Match pincode
        if pincode and c["pincode"] != pincode.strip():
            continue
            
        # Match center type / category
        if center_type and center_type.lower() != "all":
            if c["category"].lower() != center_type.lower() and center_type.lower() not in c["center_type"].lower():
                continue
                
        # Free-text search
        if search:
            q = search.lower().strip()
            text_corpus = f"{c['name']} {c['address']} {c['district']} {c['state']} {' '.join(c['services'])} {c['center_type']}".lower()
            if q not in text_corpus:
                continue

        center_data = dict(c)

        # Distance calculation
        if lat is not None and lng is not None:
            distance_km = calculate_haversine_distance(lat, lng, c["lat"], c["lng"])
            center_data["distance_km"] = distance_km
        else:
            center_data["distance_km"] = None

        # Google Maps navigation URL
        center_data["maps_url"] = f"https://www.google.com/maps/dir/?api=1&destination={c['lat']},{c['lng']}"

        results.append(center_data)

    # Sort results: by distance if coordinates provided, otherwise alphabetical by name
    if lat is not None and lng is not None:
        results.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else 99999)
    else:
        results.sort(key=lambda x: (x["state"], x["district"], x["name"]))

    return {
        "total": len(results),
        "centers": results[:limit],
        "user_location_provided": lat is not None and lng is not None
    }


@router.get("/states")
async def get_states_and_districts():
    """Retrieve unique states and their corresponding districts present in the center database."""
    state_district_map = {}
    for c in CENTERS_DATABASE:
        s = c["state"]
        d = c["district"]
        if s not in state_district_map:
            state_district_map[s] = set()
        state_district_map[s].add(d)

    formatted = [
        {
            "state": s,
            "districts": sorted(list(districts))
        }
        for s, districts in sorted(state_district_map.items())
    ]
    return {"states": formatted}
