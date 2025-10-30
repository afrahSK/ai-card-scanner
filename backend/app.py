from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from google.cloud import storage
from dotenv import load_dotenv
import pytesseract
from PIL import Image
import re
import ssl
import certifi
import urllib3
import ssl, certifi

# 🔧 Force Python globally to use certifi certificates
ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Force SSL to use certifi’s trusted certificates
ssl_context = ssl.create_default_context(cafile=certifi.where())
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
load_dotenv()

# -------------------------
# Initialize Flask app
# -------------------------
app = Flask(__name__)
# Allow CORS from React frontend
# Allow all origins and headers (safe for dev)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Initialize GCP client
storage_client = storage.Client.from_service_account_json(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
bucket_name = os.getenv("GCP_BUCKET_NAME")

# -------------------------
# Upload folder
# -------------------------
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# -------------------------
# Regex patterns
# -------------------------
EMAIL_PATTERN = r'[\w\.-]+@[\w\.-]+\.\w+'
PHONE_PATTERN = r'(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})'
COMPANY_PATTERN = r'\b[A-Z][A-Za-z&\s]+(?:Inc|Ltd|Technologies|Solutions|Systems|Corp|Company|Enterprises|Labs|Studios)?\b'


def extract_contact_info_with_boxes(image_path):
    image = cv2.imread(image_path)

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Remove noise and increase contrast
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    # Save temp processed image
    temp_path = os.path.join("uploads", "processed.png")
    cv2.imwrite(temp_path, gray)

    # OCR
    ocr_data = pytesseract.image_to_data(
        Image.open(temp_path),
        config='--psm 6 --oem 3',
        output_type=pytesseract.Output.DICT
    )

# -------------------------
# OCR + Info Extraction
# -------------------------
def extract_contact_info_with_boxes(image_path):
    image = Image.open(image_path)
    ocr_data = pytesseract.image_to_data(
    image,
    config='--psm 6 --oem 3',
    output_type=pytesseract.Output.DICT
)

    
    extracted = {"name": "", "email": "", "phone": "", "company": ""}
    boxes = {"name": None, "email": None, "phone": None, "company": None}

    # Full text
    full_text = "\n".join(ocr_data['text'])

    # Heuristic for name: first non-empty line
    lines = [line.strip() for line in full_text.split("\n") if line.strip()]
    if len(lines) >= 2 and len(lines[0].split()) == 1:
       extracted['name'] = lines[0] + " " + lines[1]
    else:
       extracted['name'] = lines[0]


    # Extract email, phone, company
    emails = re.findall(EMAIL_PATTERN, full_text)
    phones = re.findall(PHONE_PATTERN, full_text)
    companies = re.findall(COMPANY_PATTERN, full_text, flags=re.IGNORECASE)

    if emails: extracted['email'] = emails[0]
    if phones: extracted['phone'] = phones[0]
    if companies: extracted['company'] = companies[0]

    # Get bounding boxes
    for i, word in enumerate(ocr_data['text']):
        if word.strip() == '':
            continue
        left, top, width, height = ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i]
        bbox = {"x": left, "y": top, "width": width, "height": height}

        if word in extracted['name'] and not boxes['name']:
            boxes['name'] = bbox
        elif word in extracted['email'] and not boxes['email']:
            boxes['email'] = bbox
        elif word in extracted['phone'] and not boxes['phone']:
            boxes['phone'] = bbox
        elif word in extracted['company'] and not boxes['company']:
            boxes['company'] = bbox
    print("Full OCR text:\n", full_text)
    return extracted, boxes, full_text

# -------------------------
# Root route
# -------------------------
@app.route('/')
def index():
    return "Flask backend is running!"

# -------------------------
# Upload business card route
# -------------------------
@app.route('/upload-card', methods=['POST'])
def upload_card():
    print("Reached the /upload-card route")

    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    # 1️⃣ Save locally first
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    # 2️⃣ Upload to GCP bucket
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file.filename)
        blob.upload_from_filename(file_path)
        # blob.make_public()  # 👈 optional: makes file accessible via public URL
        url = blob.generate_signed_url(expiration=3600)

        gcp_file_url = blob.public_url
        print(f"✅ Uploaded to GCP: {gcp_file_url}")

    except Exception as e:
        print("❌ Error uploading to GCP:", e)
        return jsonify({"error": "Failed to upload to GCP", "details": str(e)}), 500

    # 3️⃣ Extract info using OCR
    extracted_data, boxes, raw_text = extract_contact_info_with_boxes(file_path)

    # 4️⃣ Return all details
    return jsonify({
        "status": "success",
        "message": "Card uploaded successfully",
        "gcp_url": gcp_file_url,
        "extracted_data": extracted_data,
        "boxes": boxes,
        "raw_text": raw_text
    })

# the msg sending logic to etracted email
# Use your SendGrid API key and verified Gmail
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")  # or directly paste for quick test
FROM_EMAIL = os.getenv("FROM_EMAIL")

# Simple template-based message
def generate_message(contact_name):
    return f"""
    Hi {contact_name},

    This is a test email from our Business Card Scanner app.
    Looking forward to connecting!

    Best regards,
    Afrah
    """

@app.route("/send-email", methods=["POST"])
def send_email():
    print("in send function")
    data = request.get_json() or {}
    user_sender = data.get("sender_email")
    receiver_email = data.get("receiver_email")
    contact_name = data.get("name", "there")

    if not receiver_email:
        return jsonify({"status":"error","error":"Missing receiver_email"}), 400

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=receiver_email,
        subject=f"Hi {contact_name} — quick note from Card-to-Connect",
        plain_text_content=generate_message(contact_name)
    )

    if user_sender:
        message.reply_to = user_sender

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.client.session.verify = certifi.where()
        response = sg.send(message)
        return jsonify({"status":"success","code": response.status_code})
    except Exception as e:
        print("Email sending error:", e)
        return jsonify({"status":"error","error": str(e)}), 500

# -------------------------
# Run server
# -------------------------
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
