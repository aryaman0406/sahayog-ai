import math
from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/centers", tags=["Centers"])

# Comprehensive dataset of physical centers across Indian states
CENTERS_DATABASE = [
    # Maharashtra
    {
        "id": "mah_csc_01",
        "name": "Maha E-Seva Kendra - Shivaji Nagar",
        "center_type": "Maha E-Seva",
        "category": "csc",
        "state": "Maharashtra",
        "district": "Pune",
        "pincode": "411005",
        "address": "Shop No 4, Municipal Complex, Near Shivaji Nagar Bus Stand, Pune, Maharashtra",
        "contact_person": "Suresh Patil",
        "phone": "+91 98230 11223",
        "email": "shivajinagar.eseva@gov.in",
        "operating_hours": "09:30 AM - 06:30 PM (Mon - Sat)",
        "lat": 18.5314,
        "lng": 73.8446,
        "verified": True,
        "services": [
            "Aadhaar Enrollment & Update",
            "Income & Caste Certificate Issuance",
            "PM-KISAN e-KYC & Registration",
            "Ayushman Bharat PMJAY Card",
            "MahaDBT Scholarship Applications",
            "Ration Card Services"
        ]
    },
    {
        "id": "mah_teh_01",
        "name": "Tehsildar & Taluka Magistrate Office",
        "center_type": "Tehsildar Office",
        "category": "government_office",
        "state": "Maharashtra",
        "district": "Pune",
        "pincode": "411001",
        "address": "Revenue Complex, Near Sassoon Hospital, Pune Railway Station Road, Pune, Maharashtra",
        "contact_person": "District Revenue Officer",
        "phone": "020-26123456",
        "email": "tehsildar.pune@maharashtra.gov.in",
        "operating_hours": "10:00 AM - 05:30 PM (Mon - Fri)",
        "lat": 18.5204,
        "lng": 73.8567,
        "verified": True,
        "services": [
            "Domicile & Non-Creamy Layer Certificates",
            "Land Record (7/12 & 8A) Verification",
            "Disability & Senior Citizen Pensions",
            "Public Grievance Redressal (Aaple Sarkar)"
        ]
    },
    {
        "id": "mah_csc_02",
        "name": "Common Service Center (CSC) - Dadar West",
        "center_type": "Common Service Center (CSC)",
        "category": "csc",
        "state": "Maharashtra",
        "district": "Mumbai",
        "pincode": "400028",
        "address": "Gala No 12, Senapati Bapat Marg, Near Dadar Railway Station, Mumbai, Maharashtra",
        "contact_person": "Rajesh Shinde",
        "phone": "+91 98201 44556",
        "email": "dadar.csc@csc.gov.in",
        "operating_hours": "09:00 AM - 07:00 PM (Mon - Sat)",
        "lat": 19.0178,
        "lng": 72.8478,
        "verified": True,
        "services": [
            "PM SVANidhi Application Assistance",
            "PM Vishwakarma Biometric Verification",
            "PAN & Voter ID Card Services",
            "E-Shram Card Registration"
        ]
    },
    # Uttar Pradesh
    {
        "id": "up_csc_01",
        "name": "Jan Seva Kendra (CSC) - Hazratganj",
        "center_type": "Jan Seva Kendra",
        "category": "csc",
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "pincode": "226001",
        "address": "Basement 2, Commercial Complex, MG Marg, Hazratganj, Lucknow, Uttar Pradesh",
        "contact_person": "Amit Kumar Verma",
        "phone": "+91 94150 99881",
        "email": "lucknow.janseva@up.gov.in",
        "operating_hours": "09:30 AM - 06:00 PM (Mon - Sat)",
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
        "name": "District Social Welfare Office (Vikas Bhawan)",
        "center_type": "Social Welfare Office",
        "category": "government_office",
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "pincode": "226020",
        "address": "Vikas Bhawan, Near Collectorate, KGMU Road, Lucknow, Uttar Pradesh",
        "contact_person": "District Social Welfare Officer",
        "phone": "0522-2621122",
        "email": "dswo.lucknow@up.gov.in",
        "operating_hours": "10:00 AM - 05:00 PM (Mon - Fri)",
        "lat": 26.8600,
        "lng": 80.9200,
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
        "name": "Digital Seva Kendra - Sector 62",
        "center_type": "Common Service Center (CSC)",
        "category": "csc",
        "state": "Uttar Pradesh",
        "district": "Gautam Buddha Nagar (Noida)",
        "pincode": "201309",
        "address": "Plot 18, Block B, Electronic City, Sector 62, Noida, Uttar Pradesh",
        "contact_person": "Pooja Sharma",
        "phone": "+91 98112 33445",
        "email": "noida62.csc@gmail.com",
        "operating_hours": "09:00 AM - 07:00 PM (Mon - Sat)",
        "lat": 28.6280,
        "lng": 77.3649,
        "verified": True,
        "services": [
            "Income & Domicile e-District Applications",
            "PMAY Housing Application Assistance",
            "Mudra Loan Scheme Guidance",
            "Aadhaar Update & KYC"
        ]
    },
    # Delhi NCT
    {
        "id": "del_csc_01",
        "name": "Delhi Govt Seva Kendra - Connaught Place",
        "center_type": "Seva Kendra",
        "category": "government_office",
        "state": "Delhi",
        "district": "New Delhi",
        "pincode": "110001",
        "address": "Palika Kendra, Sansad Marg, Connaught Place, New Delhi",
        "contact_person": "Navin Gupta",
        "phone": "011-23340011",
        "email": "ndmc.sevakendra@delhi.gov.in",
        "operating_hours": "09:00 AM - 05:30 PM (Mon - Sat)",
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
        "name": "CSC Digital Point - Rohini Sector 7",
        "center_type": "Common Service Center (CSC)",
        "category": "csc",
        "state": "Delhi",
        "district": "North West Delhi",
        "pincode": "110085",
        "address": "Shop 14, DDA Market, Sector 7, Rohini, New Delhi",
        "contact_person": "Vikram Singh",
        "phone": "+91 98711 22334",
        "email": "rohini.csc@digitalindia.gov.in",
        "operating_hours": "09:30 AM - 08:00 PM (Mon - Sat)",
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
    # Karnataka
    {
        "id": "kar_b1_01",
        "name": "Bangalore One Seva Kendra - Indiranagar",
        "center_type": "Bangalore One",
        "category": "government_office",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "pincode": "560038",
        "address": "100 Feet Road, Near CMH Hospital, Indiranagar, Bengaluru, Karnataka",
        "contact_person": "Manjunath Gowda",
        "phone": "080-25201122",
        "email": "indiranagar.b1@karnataka.gov.in",
        "operating_hours": "08:00 AM - 07:00 PM (All 7 Days)",
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
        "name": "Gram One Center - Nelamangala",
        "center_type": "Gram One (CSC)",
        "category": "csc",
        "state": "Karnataka",
        "district": "Bengaluru Rural",
        "pincode": "562123",
        "address": "Gram Panchayat Complex, Main Road, Nelamangala, Karnataka",
        "contact_person": "Basavaraju K",
        "phone": "+91 94480 55667",
        "email": "nelamangala.gramone@karnataka.gov.in",
        "operating_hours": "09:00 AM - 06:00 PM (Mon - Sat)",
        "lat": 13.0970,
        "lng": 77.3878,
        "verified": True,
        "services": [
            "Raitha Siri / Farmer Subsidies",
            "PM-KISAN e-KYC & Land Seeding",
            "Pashu Bhagya Loan Processing",
            "Sandhya Suraksha Pension"
        ]
    },
    # Tamil Nadu
    {
        "id": "tn_esevai_01",
        "name": "TNeGA e-Sevai Maiyam - T. Nagar",
        "center_type": "e-Sevai",
        "category": "csc",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "pincode": "600017",
        "address": "Corporation Shopping Complex, South Usman Road, T. Nagar, Chennai, Tamil Nadu",
        "contact_person": "Karthik Subramanian",
        "phone": "044-24345678",
        "email": "tnagar.esevai@tnega.in",
        "operating_hours": "09:30 AM - 05:30 PM (Mon - Sat)",
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
        "name": "Taluk Office - Guindy",
        "center_type": "Taluk Office",
        "category": "government_office",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "pincode": "600032",
        "address": "Taluk Administrative Complex, Anna Salai, Guindy, Chennai, Tamil Nadu",
        "contact_person": "Tahsildar Guindy",
        "phone": "044-22501234",
        "email": "tahsildar.guindy@tn.gov.in",
        "operating_hours": "10:00 AM - 05:45 PM (Mon - Fri)",
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
    # Telangana & Andhra Pradesh (MeeSeva)
    {
        "id": "ts_meeseva_01",
        "name": "MeeSeva Center - Banjara Hills",
        "center_type": "MeeSeva",
        "category": "csc",
        "state": "Telangana",
        "district": "Hyderabad",
        "pincode": "500034",
        "address": "Road No 12, Beside Post Office, Banjara Hills, Hyderabad, Telangana",
        "contact_person": "Venkata Raman",
        "phone": "+91 99890 12345",
        "email": "hyd.meeseva@telangana.gov.in",
        "operating_hours": "09:00 AM - 07:00 PM (Mon - Sat)",
        "lat": 17.4123,
        "lng": 78.4482,
        "verified": True,
        "services": [
            "Rythu Bandhu & Rythu Bima Verification",
            "Kalyana Lakshmi / Shaadi Mubarak",
            "Aasara Pension Registration",
            "Integrated Caste & Income Certificate"
        ]
    },
    # Rajasthan (E-Mitra)
    {
        "id": "raj_emitra_01",
        "name": "E-Mitra Kendra - Mansarovar",
        "center_type": "E-Mitra",
        "category": "csc",
        "state": "Rajasthan",
        "district": "Jaipur",
        "pincode": "302020",
        "address": "Plot 45, Madhyam Marg, Mansarovar, Jaipur, Rajasthan",
        "contact_person": "Mahesh Choudhary",
        "phone": "+91 94140 33221",
        "email": "jaipur.emitra@rajasthan.gov.in",
        "operating_hours": "09:00 AM - 08:00 PM (Mon - Sat)",
        "lat": 26.8530,
        "lng": 75.7680,
        "verified": True,
        "services": [
            "Chiranjeevi / Mukhyamantri Ayushman Swasthya Bima",
            "Jan Aadhaar Card Enrolment & Linking",
            "Palanhar Scheme Application",
            "Social Security Pension (SSP) Renewal"
        ]
    },
    # Gujarat
    {
        "id": "guj_csc_01",
        "name": "Digital Gujarat Jan Seva Kendra - Navrangpura",
        "center_type": "Jan Seva Kendra",
        "category": "government_office",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "pincode": "380009",
        "address": "Sub-Registrar Building, Near University Ground, Navrangpura, Ahmedabad, Gujarat",
        "contact_person": "Jignesh Patel",
        "phone": "079-26301199",
        "email": "ahmedabad.janseva@gujarat.gov.in",
        "operating_hours": "10:00 AM - 06:00 PM (Mon - Sat)",
        "lat": 23.0373,
        "lng": 72.5516,
        "verified": True,
        "services": [
            "Maa Vatsalya & PMJAY Ayushman Card",
            "Mukhyamantri Kisan Sahay Yojana",
            "Kanya Kelavani Education Assistance",
            "Non-Creamy Layer (NCL) Certificate"
        ]
    },
    # West Bengal
    {
        "id": "wb_bsk_01",
        "name": "Bangla Sahayata Kendra (BSK) - Salt Lake",
        "center_type": "Bangla Sahayata Kendra",
        "category": "csc",
        "state": "West Bengal",
        "district": "Kolkata",
        "pincode": "700091",
        "address": "Bikash Bhavan Campus, Sector 1, Salt Lake City, Kolkata, West Bengal",
        "contact_person": "Anirban Roy",
        "phone": "033-23347788",
        "email": "bsk.saltlake@wb.gov.in",
        "operating_hours": "10:00 AM - 05:30 PM (Mon - Fri)",
        "lat": 22.5868,
        "lng": 88.4178,
        "verified": True,
        "services": [
            "Lakshmir Bhandar Scheme Registration",
            "Krishak Bandhu Assistance",
            "Swasthya Sathi Smart Card",
            "Kanyashree Prakalpa Application"
        ]
    },
    # Bihar
    {
        "id": "bih_rtps_01",
        "name": "RTPS & Vasudha Kendra (CSC) - Kankarbagh",
        "center_type": "RTPS Counter / CSC",
        "category": "csc",
        "state": "Bihar",
        "district": "Patna",
        "pincode": "800020",
        "address": "Block Development Office Campus, Kankarbagh Main Road, Patna, Bihar",
        "contact_person": "Ramesh Chandra Prasad",
        "phone": "+91 94310 88776",
        "email": "patna.rtps@bihar.gov.in",
        "operating_hours": "09:30 AM - 05:30 PM (Mon - Sat)",
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
    # Madhya Pradesh
    {
        "id": "mp_lokseva_01",
        "name": "Lok Seva Kendra - MP Nagar",
        "center_type": "Lok Seva Kendra",
        "category": "csc",
        "state": "Madhya Pradesh",
        "district": "Bhopal",
        "pincode": "462011",
        "address": "Zone 1, MP Nagar, Near Chetak Bridge, Bhopal, Madhya Pradesh",
        "contact_person": "Alok Sharma",
        "phone": "0755-2554433",
        "email": "bhopal.lokseva@mp.gov.in",
        "operating_hours": "09:30 AM - 06:00 PM (Mon - Sat)",
        "lat": 23.2332,
        "lng": 77.4344,
        "verified": True,
        "services": [
            "Mukhyamantri Ladli Behna Yojana",
            "Sambal 2.0 Jan Kalyan Portal Services",
            "PM-KISAN / MP Kisan Kalyan Yojana",
            "Samagra ID Update & Verification"
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
    limit: int = Query(25, ge=1, le=100)
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
