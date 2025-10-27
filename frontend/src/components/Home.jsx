import React, { useState, useEffect } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EmailIcon from '@mui/icons-material/Email';
import MessageIcon from '@mui/icons-material/Message';
import SunnyIcon from '@mui/icons-material/Sunny';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import WorkIcon from '@mui/icons-material/Work';
import AddModeratorIcon from '@mui/icons-material/AddModerator';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';

// --- Action Button ---
const ActionButton = ({ children, onClick, variant = 'primary', isActive = false, className = '' }) => {
  let baseClasses = 'flex items-center justify-center p-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 ';

  if (variant === 'primary') {
    baseClasses += 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:ring-indigo-500/50';
  } else if (variant === 'secondary') {
    baseClasses += 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:ring-gray-400/50';
  } else if (variant === 'outline') {
    baseClasses += 'border border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-gray-700 focus:ring-indigo-500/50';
  }

  if (isActive) baseClasses += ' ring-4 ring-offset-2 ring-indigo-500/50 dark:ring-offset-gray-800 scale-105';

  return (
    <button onClick={onClick} className={`${baseClasses} ${className}`}>
      {children}
    </button>
  );
};

// --- Extracted Field Component ---
const ExtractedField = ({ icon: Icon, label, value }) => (
  <div className="flex items-start space-x-3 mb-4 last:mb-0 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
    <Icon className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
    <div className='flex flex-col'>
      <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium break-all text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  </div>
);

const Home = () => {
  const [theme, setTheme] = useState('light');
  const [selectedFile, setSelectedFile] = useState(null);
  const [cardImage, setCardImage] = useState(null);
  const [extractedData, setExtractedData] = useState({});
  const [boxes, setBoxes] = useState(null);
  const [communicationChannel, setCommunicationChannel] = useState('email');
  const [messageType, setMessageType] = useState('personalized');
  const [messageContent, setMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Update message content for AI personalized messages
  useEffect(() => {
    if (messageType === 'personalized') {
      setMessageContent(`Hello ${extractedData.name || 'there'}, I recently digitized your business card from ${extractedData.company || ''}. I was impressed by your role as ${extractedData.title || ''}. I'd love to connect.`);
    }
  }, [messageType, extractedData]);

  // --- Upload File & Send to Backend ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setCardImage(URL.createObjectURL(file));
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/upload-card", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload");

      const data = await response.json();
      console.log("Backend response:", data);

      // Set extracted data & bounding boxes
      setExtractedData({
        name: data.extracted_data.name,
        title: data.extracted_data.title || '',
        email: data.extracted_data.email,
        phone: data.extracted_data.phone,
        company: data.extracted_data.company
      });
      setBoxes(data.boxes);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading card. Check console.");
    } finally {
      setIsLoading(false);
    }
  };


  const [status, setStatus] = useState("");
  // const communicationChannel = "Email";

  const handleSendMessage = async () => {
    setStatus("Sending...");
    // receiver: extractedData.email (dynamic)
    const receiverEmail = extractedData?.email;
    const name = extractedData?.name || "there";

    if (!receiverEmail) {
      setStatus("No recipient email found in extracted data.");
      return;
    }
    if (!senderEmail) {
      // allow sending with no sender typed (optional)
      setStatus("Please enter your email first (will be used as Reply-To).");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_email: senderEmail,
          receiver_email: receiverEmail,
          name: name
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setStatus(`Email sent successfully! (${data.code})`);
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatus(`Fetch error: ${err.message}`);
    }
  };




  const containerClasses = theme === 'dark'
    ? 'dark bg-gray-900 text-gray-100 min-h-screen transition-colors duration-300'
    : 'bg-gray-50 text-gray-900 min-h-screen transition-colors duration-300';

  const cardBaseClasses = 'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl transition-all duration-300';

  return (
    <div className={containerClasses}>
      <header className="py-4 px-6 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-10 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Card-to-Connect.</h1>
          <button onClick={toggleTheme} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            {theme === 'light' ? <BedtimeIcon /> : <SunnyIcon />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN: Upload & Preview */}
          <div className="lg:col-span-1 space-y-8">
            <div className={`${cardBaseClasses} h-auto`}>
              <h2 className="text-xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">1. Upload Business Card</h2>

              <label htmlFor="card-upload" className="block w-full h-48 border-4 border-dashed rounded-xl p-4 cursor-pointer transition-all duration-300 border-indigo-400 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 flex flex-col items-center justify-center text-center">
                <CloudUploadIcon />
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {cardImage ? 'Card uploaded. Click to change.' : 'Drag & drop image here, or click to select.'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                <input id="card-upload" type="file" accept="image/png, image/jpeg" onChange={handleFileUpload} className="hidden" />
              </label>

              {cardImage && (
                <div className="mt-6 relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 dark:border-gray-700">
                  <img src={cardImage} alt="Uploaded Business Card" className="w-full h-full object-cover" />

                  {/* Loading overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-white flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-2 text-sm font-medium">Scanning with DL...</p>
                      </div>
                    </div>
                  )}

                  {/* Bounding boxes */}
                  {boxes && Object.keys(boxes).map((key) => {
                    const box = boxes[key];
                    if (!box) return null;
                    return (
                      <div key={key} style={{
                        position: 'absolute',
                        left: box.x,
                        top: box.y,
                        width: box.width,
                        height: box.height,
                        border: '2px solid #4f46e5',
                        pointerEvents: 'none',
                        boxSizing: 'border-box'
                      }}>
                        <span className="absolute -top-4 left-0 text-indigo-500 text-xs font-semibold">{key}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Extracted Data & Messaging */}
          <div className="lg:col-span-2 space-y-8">
            <div className={cardBaseClasses}>
              <h2 className="text-xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                2. Extracted Contact Information
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${isLoading ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'}`}>
                  {isLoading ? 'Processing' : (cardImage ? 'Extracted' : 'Awaiting Card')}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ExtractedField icon={AccountBoxIcon} label="Name" value={extractedData.name || 'N/A'} />
                <ExtractedField icon={LocalPhoneIcon} label="Title" value={extractedData.title || 'N/A'} />
                <ExtractedField icon={AddModeratorIcon} label="Email" value={extractedData.email || 'N/A'} />
                <ExtractedField icon={WorkIcon} label="Phone" value={extractedData.phone || 'N/A'} />
                <ExtractedField icon={LocalPhoneIcon} label="Company" value={extractedData.company || 'N/A'} />
              </div>
            </div>
            {/* Sender email input (user types their email) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your email (will be set as reply-to)</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">For now we will send from the app's verified sender and set this as Reply-To.</p>
            </div>

            <div className={cardBaseClasses}>
              <h2 className="text-xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">3. Draft & Send Message</h2>

              <div className="mb-6">
                <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Communication Channel</h3>
                <div className="flex space-x-4">
                  <ActionButton isActive={communicationChannel === 'email'} onClick={() => setCommunicationChannel('email')} variant="outline" className="w-1/2">
                    <EmailIcon /> Email
                  </ActionButton>
                  <ActionButton isActive={communicationChannel === 'whatsapp'} onClick={() => setCommunicationChannel('whatsapp')} variant="outline" className="w-1/2">
                    <MessageIcon /> WhatsApp
                  </ActionButton>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Message Type</h3>
                <div className="flex space-x-4">
                  <ActionButton isActive={messageType === 'personalized'} onClick={() => setMessageType('personalized')} variant="secondary" className="w-1/2">
                    <AutoAwesomeIcon /> AI Personalized
                  </ActionButton>
                  <ActionButton isActive={messageType === 'custom'} onClick={() => setMessageType('custom')} variant="secondary" className="w-1/2">
                    <HistoryEduIcon /> Custom Draft
                  </ActionButton>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Message Content</h3>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={messageType === 'personalized' ? 'AI will generate a personalized message here...' : 'Write your custom message here...'}
                  disabled={messageType === 'personalized'}
                  rows={6}
                  className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100 transition-colors"
                ></textarea>
              </div>

              <ActionButton onClick={handleSendMessage} variant="primary" className="w-full text-lg py-3">
                Send {communicationChannel === 'email' ? 'Email' : 'WhatsApp'} to {extractedData.name?.split(' ')[0] || 'Recipient'} <ArrowForwardIcon />
              </ActionButton>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Home;
