import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import google.generativeai as genai
from app.config import settings

router = APIRouter(prefix="/api/grievance", tags=["Grievance & RTI"])

class GrievanceDraftRequest(BaseModel):
    application_type: str = Field(..., description="Either 'CPGRAMS' or 'RTI'")
    scheme_name: str = Field(..., description="Name of the government scheme")
    applicant_name: str = Field(..., description="Full name of applicant")
    applicant_address: str = Field(..., description="Address, District, and State")
    applicant_phone: Optional[str] = Field(None, description="Contact phone number")
    applicant_email: Optional[str] = Field(None, description="Contact email")
    application_reference_no: Optional[str] = Field(None, description="Reference or Acknowledgment Number")
    application_date: Optional[str] = Field(None, description="Date of original scheme application")
    grievance_type: str = Field(..., description="Category of issue e.g. Delayed Disbursal, Wrongful Rejection, No Acknowledgment")
    description: str = Field(..., description="Specific facts and details of the grievance")
    language: str = Field("en", description="Target language code (en, hi, mr, bn, ta, te, gu, kn)")


def generate_offline_cpgrams_draft(req: GrievanceDraftRequest) -> dict:
    """Fallback generator for CPGRAMS (Centralized Public Grievance Redress and Monitoring System) draft."""
    date_str = datetime.now().strftime("%d-%m-%Y")
    ref_clause = f"Original Application Reference ID: {req.application_reference_no}" if req.application_reference_no else "Application Reference ID: [Mention if available]"
    app_date_clause = f"Applied on Date: {req.application_date}" if req.application_date else "Applied on: [Approximate Month/Year]"
    
    if req.language == "hi":
        subject = f"शिकायत: {req.scheme_name} योजना के अंतर्गत लाभ न मिलने / {req.grievance_type} के संबंध में"
        body = f"""प्रति,
नोडल लोक शिकायत अधिकारी,
सक्षम मंत्रालय / विभाग / जिला समाज कल्याण विभाग,
{req.applicant_address}

विषय: {subject}

महोदय/महोदया,

मैं, {req.applicant_name}, निवासी {req.applicant_address}, {req.scheme_name} योजना के अंतर्गत एक पात्र लाभार्थी हूँ।

मैंने इस योजना के अंतर्गत निर्धारित प्रक्रियानुसार समस्त आवश्यक दस्तावेजों के साथ आवेदन किया था।
- {ref_clause}
- {app_date_clause}
- समस्या का प्रकार: {req.grievance_type}

विवरण:
{req.description}

योजना के दिशा-निर्देशों एवं सिटीजन चार्टर के अनुसार निर्धारित समय-सीमा पूर्ण होने के उपरांत भी मुझे योजना का देय लाभ प्राप्त नहीं हुआ है अथवा असंगत कारणों से विलंब किया जा रहा है। इस संबंध में स्थानीय कार्यालयों में संपर्क करने पर कोई संतोषजनक निवारण नहीं हुआ।

अतः आपसे विनम्र निवेदन है कि:
1. मेरे आवेदन की अद्यतन स्थिति (Current Processing Status) की तत्काल जांच कराई जाए।
2. नियमानुसार देय वित्तीय / कल्याणकारी सहायता अविलंब जारी की जाए।
3. विलंब अथवा अनुचित कार्यवाही हेतु जिम्मेदार अधिकारी/कर्मचारी के विरुद्ध उचित विभागीय संज्ञान लिया जाए।

सधन्यवाद।

भवदीय,
नाम: {req.applicant_name}
पता: {req.applicant_address}
मोबाइल नंबर: {req.applicant_phone or '[आपका फोन नंबर]'}
दिनांक: {date_str}"""
    else:
        subject = f"Public Grievance: Non-Disbursal / Issue regarding {req.scheme_name} ({req.grievance_type})"
        body = f"""To,
The Public Grievance Redressal Officer / District Nodal Officer,
Concerned Department / Ministry for {req.scheme_name},
{req.applicant_address}

Subject: {subject}

Respected Sir/Madam,

I, {req.applicant_name}, residing at {req.applicant_address}, submit this formal grievance regarding the delayed/denied welfare benefit under the scheme: '{req.scheme_name}'.

1. Application Details:
   - Applicant Name: {req.applicant_name}
   - {ref_clause}
   - {app_date_clause}
   - Nature of Issue: {req.grievance_type}

2. Statement of Facts:
   {req.description}

3. Legal & Procedural Grounds:
   As per the Citizens' Charter and official operational guidelines of {req.scheme_name}, eligible citizen applications must be disposed of within the mandated time-bound period. However, despite being fully eligible and having submitted all requisite verification documents, the benefit has not reached me.

4. Relief Sought:
   In view of the above facts, I humbly request your good office to:
   a) Expedite the processing of my pending application and disburse the entitled benefit without further delay.
   b) Share the official reason for the delay or unjustified status update in writing.
   c) Direct the concerned field verification officers to complete formalities in a time-bound manner.

Thanking you,

Yours sincerely,
{req.applicant_name}
Address: {req.applicant_address}
Contact: {req.applicant_phone or '[Phone Number]'} | {req.applicant_email or '[Email Address]'}
Date: {date_str}"""

    return {
        "subject": subject,
        "body": body,
        "portal_name": "CPGRAMS (Centralized Public Grievance Redress and Monitoring System)",
        "portal_url": "https://pgportal.gov.in",
        "instructions": [
            "1. Visit the official CPGRAMS portal at pgportal.gov.in (or your state's portal like Aaple Sarkar, CM Helpline, Jan Sunwai).",
            "2. Click 'Lodge Public Grievance' and register/sign in with your mobile number.",
            "3. Select the Ministry/Department in charge of the scheme.",
            "4. Copy and paste the Subject and Body generated above into the grievance description box.",
            "5. Attach supporting documents (Aadhaar copy, acknowledgment receipt, application form) in PDF format (under 4MB).",
            "6. Note down the unique Registration Number to track the grievance status (Standard resolution timeline: 30 days)."
        ]
    }


def generate_offline_rti_draft(req: GrievanceDraftRequest) -> dict:
    """Fallback generator for Right to Information (RTI) Act, 2005 application."""
    date_str = datetime.now().strftime("%d-%m-%Y")
    ref_clause = f"Original Scheme Application Reference No: {req.application_reference_no}" if req.application_reference_no else "Scheme Application Reference: [Mention your Application/Aadhaar/Enrollment No]"
    app_date_clause = f"Date of Submission: {req.application_date}" if req.application_date else "Date of Submission: [Approximate Date]"

    if req.language == "hi":
        subject = f"सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के अंतर्गत आवेदन - {req.scheme_name}"
        body = f"""प्रति,
केंद्रीय / राज्य लोक सूचना अधिकारी (CPIO / SPIO),
सक्षम विभाग / मंत्रालय ({req.scheme_name}),
{req.applicant_address}

विषय: {subject}

आवेदक का विवरण:
1. नाम: {req.applicant_name}
2. पत्राचार का पता: {req.applicant_address}
3. फोन नंबर / ईमेल: {req.applicant_phone or '[फोन नंबर]'} / {req.applicant_email or '[ईमेल]'}

महोदय,
कृपया सूचना का अधिकार अधिनियम, 2005 की धारा 6(1) के अंतर्गत निम्नलिखित बिंदुवार प्रमाणित सूचना उपलब्ध कराने की कृपा करें:

संदर्भ:
- योजना का नाम: {req.scheme_name}
- {ref_clause}
- {app_date_clause}
- समस्या का विषय: {req.grievance_type} ({req.description})

मांगी गई जानकारी:
1. मेरे उक्त आवेदन पर विभाग द्वारा आज दिनांक तक की गई दैनिक प्रगति रिपोर्ट (Daily Progress Report) तथा संबंधित नोटिंग (File Notings) की प्रमाणित प्रति प्रदान की जाए।
2. इस आवेदन के निस्तारण हेतु विभाग के सिटीजन चार्टर के अनुसार निर्धारित अधिकतम समय-सीमा क्या है?
3. यदि आवेदन निर्धारित समय-सीमा के उपरांत भी लंबित है, तो इसके लिए उत्तरदायी अधिकारियों/कर्मचारियों के नाम एवं पदनाम की जानकारी दी जाए।
4. आवेदन में यदि कोई त्रुटि पाई गई है, तो क्या इसकी सूचना आवेदक को लिखित रूप में दी गई? यदि हाँ, तो पत्राचार की प्रति प्रदान करें।
5. मेरे खाते में योजना की धनराशि / लाभ कब तक अंतरित (Disburse) कर दिया जाएगा, इसकी अनुमानित समय-सीमा की सूचना प्रदान करें।

आवेदन शुल्क:
मैं केंद्र सरकार/राज्य सरकार के नियमानुसार निर्धारित ₹10 का आवेदन शुल्क (पोस्टल ऑर्डर / चालान / ऑनलाइन गेटवे) संलग्न कर रहा/रही हूँ। (यदि बीपीएल श्रेणी में हैं तो बीपीएल प्रमाण पत्र संलग्न है)।

दिनांक: {date_str}
स्थान: {req.applicant_address}

हस्ताक्षर:
({req.applicant_name})"""
    else:
        subject = f"Application under Section 6(1) of the Right to Information Act, 2005 regarding {req.scheme_name}"
        body = f"""To,
The Central / State Public Information Officer (CPIO / SPIO),
Department / Ministry administering '{req.scheme_name}',
Office Address: [Concerned District/State Ministry Office],
{req.applicant_address}

Subject: {subject}

1. Particulars of the Applicant:
   a) Name: {req.applicant_name}
   b) Address: {req.applicant_address}
   c) Contact: {req.applicant_phone or '[Phone]'} | {req.applicant_email or '[Email]'}

2. Reference & Context:
   - Welfare Scheme: {req.scheme_name}
   - {ref_clause}
   - {app_date_clause}
   - Core Grievance: {req.grievance_type} - {req.description}

3. Information Sought under Section 6(1) of RTI Act, 2005:
   Please provide certified copies / point-wise information for the following:
   i. Provide the daily progress report and certified copies of all file notings/correspondence regarding my application for {req.scheme_name}.
   ii. State the official Citizens' Charter timeline prescribed for the scrutiny, approval, and fund disbursal under this scheme.
   iii. If the application has been delayed beyond the prescribed timeline, provide the names and designations of the officers/staff responsible for the delay.
   iv. State whether any deficiency or objection was formally communicated to the applicant. If yes, provide a certified copy of such notice.
   v. Provide the expected date by which the entitled welfare benefit / payment will be credited to the applicant's account.

4. Application Fee:
   The prescribed RTI fee of ₹10/- is paid via [Online Portal / Indian Postal Order (IPO) / Court Fee Stamp].
   (Note: If the applicant belongs to the Below Poverty Line (BPL) category, fee is exempt upon providing BPL Card copy).

Place: {req.applicant_address}
Date: {date_str}

Sincerely,
(Signature of Applicant)
{req.applicant_name}"""

    return {
        "subject": subject,
        "body": body,
        "portal_name": "RTI Online (Right to Information Portal)",
        "portal_url": "https://rtionline.gov.in",
        "instructions": [
            "1. Visit the central RTI portal at rtionline.gov.in (for central schemes) or your state's online RTI portal.",
            "2. Click 'Submit Request' and accept the terms.",
            "3. Select the relevant Ministry / Public Authority (e.g. Ministry of Agriculture, Social Justice & Empowerment, Health & Family Welfare).",
            "4. Paste the generated RTI text in the 'Text for RTI Request Application' field.",
            "5. Pay the nominal ₹10 RTI fee using UPI, NetBanking, or Debit Card (Free for BPL card holders).",
            "6. Download the RTI registration receipt with your unique Registration Number. By law (RTI Act 2005), the PIO must reply within 30 days."
        ]
    }


@router.post("/draft")
async def create_grievance_draft(req: GrievanceDraftRequest):
    """
    Generate a legally sound, structured CPGRAMS grievance or RTI draft application
    using Gemini AI (or the robust offline template engine if Gemini is unavailable).
    """
    if req.application_type.upper() not in ["CPGRAMS", "RTI"]:
        raise HTTPException(status_code=400, detail="application_type must be either 'CPGRAMS' or 'RTI'")

    # Attempt AI generation if Gemini API Key is configured
    if settings.GEMINI_API_KEY:
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            type_label = "Central Public Grievance (CPGRAMS)" if req.application_type.upper() == "CPGRAMS" else "Right to Information (RTI Act 2005) Application"
            
            prompt = f"""You are an expert legal and administrative advisor for Indian citizen welfare schemes.
Write a formal, highly professional, and legally precise {type_label} document in language code '{req.language}'.

Applicant Details:
- Name: {req.applicant_name}
- Address: {req.applicant_address}
- Phone: {req.applicant_phone or 'N/A'}
- Email: {req.applicant_email or 'N/A'}
- Scheme Name: {req.scheme_name}
- Reference / Acknowledgment ID: {req.application_reference_no or 'N/A'}
- Original Application Date: {req.application_date or 'N/A'}
- Grievance Category: {req.grievance_type}
- Specific Details provided by citizen: {req.description}

Requirements:
1. If CPGRAMS: Address to the Public Grievance Nodal Officer. Cite Citizen's Charter and administrative guidelines. Clearly state facts and specific relief sought.
2. If RTI: Strictly follow Section 6(1) of RTI Act 2005. Format numbered point-by-point information requests (file notings, daily progress, officer accountability, disbursal timeline).
3. Do not include markdown code block backticks (like ```markdown). Return a clean, printable official letter format.
4. Keep the tone respectful, firm, and legally sound.
"""
            response = model.generate_content(prompt)
            ai_text = response.text.strip()
            
            if req.application_type.upper() == "CPGRAMS":
                base_info = generate_offline_cpgrams_draft(req)
            else:
                base_info = generate_offline_rti_draft(req)
                
            return {
                "application_type": req.application_type.upper(),
                "subject": f"[{req.application_type.upper()}] {req.scheme_name} - {req.grievance_type}",
                "body": ai_text,
                "portal_name": base_info["portal_name"],
                "portal_url": base_info["portal_url"],
                "instructions": base_info["instructions"],
                "generated_by": "Gemini AI (Pro Administrative Assistant)"
            }
        except Exception as e:
            # Fallback seamlessly to offline structured generator
            pass

    # Offline rule-based template generation
    if req.application_type.upper() == "CPGRAMS":
        res = generate_offline_cpgrams_draft(req)
    else:
        res = generate_offline_rti_draft(req)

    res["application_type"] = req.application_type.upper()
    res["generated_by"] = "Rule-based Legal Template Engine"
    return res
