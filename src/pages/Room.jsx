import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaPaperPlane, FaPaperclip, FaFileAlt, FaArrowLeft, FaClock, FaEdit, FaUserCircle, FaQrcode, FaDownload, FaLock } from 'react-icons/fa';
import { Container, Row, Col, Card, Form, Button, InputGroup, Navbar, Badge, Spinner, Modal } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { generateKey, exportKeyToBase64, importKeyFromBase64, encryptText, decryptText, encryptFile, decryptFile } from '../utils/crypto';

const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';
const BASE_URL = import.meta.env.VITE_API_URL || '';

const buildDownloadUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  
  // Crypto Key
  const [cryptoKey, setCryptoKey] = useState(null);

  // User Identity State
  const [senderId] = useState(Math.random().toString(36).substr(2, 9));
  const [username, setUsername] = useState('Anonymous');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);

  const [expiryTime, setExpiryTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const initCrypto = async () => {
      try {
        let hash = window.location.hash;
        let key;
        if (hash && hash.startsWith('#k=')) {
          const base64Key = hash.substring(3);
          key = await importKeyFromBase64(base64Key);
        } else {
          key = await generateKey();
          const exportedKey = await exportKeyToBase64(key);
          window.location.hash = `k=${exportedKey}`;
        }
        setCryptoKey(key);
      } catch (e) {
        console.error('Crypto Init Error', e);
        setRoomError('Failed to initialize encryption key. Link may be broken.');
        setLoading(false);
      }
    };
    initCrypto();
  }, []);

  const fetchRoom = async () => {
    if (!cryptoKey) return;
    try {
      const res = await axios.get(`${API_URL}/room/${roomId}`);
      
      // Decrypt messages
      const decryptedMessages = await Promise.all(res.data.messages.map(async (msg) => {
        if (msg.type === 'text') {
          try {
            const parts = msg.content.split(':');
            if (parts.length === 2) {
              const decrypted = await decryptText(parts[0], parts[1], cryptoKey);
              return { ...msg, content: decrypted };
            }
            return { ...msg, content: "[Malformed Encrypted Message]" };
          } catch (e) {
            return { ...msg, content: "[Decryption Failed]" };
          }
        }
        // For files, we don't decrypt content (which is the URL).
        return msg;
      }));

      setMessages(decryptedMessages);
      
      if (!expiryTime) {
        const created = new Date(res.data.createdAt).getTime();
        const expires = created + 30 * 60 * 1000;
        setExpiryTime(expires);
      }
      
      setLoading(false);
    } catch (err) {
      setRoomError('Room not found or expired');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cryptoKey) return;
    fetchRoom();
    const interval = setInterval(() => {
      fetchRoom();
    }, 3000);
    return () => clearInterval(interval);
  }, [roomId, expiryTime, cryptoKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer effect
  useEffect(() => {
    if (!expiryTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = expiryTime - now;
      if (diff <= 0) {
        setRoomError('Room expired');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;
    if (!cryptoKey) return alert("Encryption key not loaded");

    if (file) {
      handleFileUpload();
    } else {
      const originalText = newMessage;
      setNewMessage('');
      try {
        const { iv, ciphertext } = await encryptText(originalText, cryptoKey);
        const encryptedContent = `${iv}:${ciphertext}`;

        const messageData = {
          roomId,
          type: 'text',
          content: encryptedContent,
          senderId,
          senderName: username
        };
        await axios.post(`${API_URL}/messages`, messageData);
        fetchRoom();
      } catch (err) {
        console.error('Failed to send encrypted message', err);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!cryptoKey) return alert("Encryption key not loaded");
    setUploading(true);
    
    try {
      // Encrypt file in memory
      const arrayBuffer = await file.arrayBuffer();
      const { iv, ciphertextBuffer } = await encryptFile(arrayBuffer, cryptoKey);
      
      // Combine IV and Ciphertext for upload (or send IV as metadata)
      // To keep it simple and fit into the existing File schema, we can prepend the 12-byte IV to the ciphertext buffer.
      const combinedBuffer = new Uint8Array(12 + ciphertextBuffer.byteLength);
      combinedBuffer.set(new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0))), 0);
      combinedBuffer.set(new Uint8Array(ciphertextBuffer), 12);

      const encryptedBlob = new Blob([combinedBuffer], { type: 'application/octet-stream' });

      const formData = new FormData();
      // Upload as the original filename so multer handles it, but it's an encrypted blob
      formData.append('file', encryptedBlob, file.name);
      
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const messageData = {
        roomId,
        type: 'file',
        content: res.data.url,
        originalName: file.name, // Keep original name for UI
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        senderId,
        senderName: username
      };
      
      await axios.post(`${API_URL}/messages`, messageData);
      
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRoom();
    } catch (err) {
      console.error('Upload failed', err);
      alert('File upload failed. Ensure the file is under 15MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (url, originalName, mimeType, fileId) => {
    if (!cryptoKey) return alert("Encryption key not loaded");
    setDownloadingFile(fileId);
    try {
      const downloadUrl = buildDownloadUrl(url);
      const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
      const encryptedData = new Uint8Array(response.data);
      
      // Extract IV (first 12 bytes)
      const ivArray = encryptedData.slice(0, 12);
      const ivBase64 = btoa(String.fromCharCode(...ivArray));
      const ciphertextBuffer = encryptedData.slice(12).buffer;

      const decryptedBuffer = await decryptFile(ivBase64, ciphertextBuffer, cryptoKey);
      
      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error('Download/Decrypt failed', e);
      alert('Failed to decrypt and download file.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleFileSelect = (e) => {
    setFile(e.target.files[0]);
  };

  const handleNameChange = () => {
    if (tempName.trim()) {
      setUsername(tempName.trim());
      setShowNameModal(false);
    }
  };

  if (loading) return (
    <div className="bg-animated-gradient d-flex justify-content-center align-items-center vh-100">
      <Spinner animation="border" variant="light" style={{ width: '3rem', height: '3rem' }} />
    </div>
  );

  if (roomError) return (
    <Container className="d-flex flex-column justify-content-center align-items-center vh-100">
      <Card className="glass-card p-5 text-center">
        <h2 className="text-danger fw-bold mb-4">{roomError}</h2>
        <Button variant="primary" className="rounded-pill px-4" onClick={() => navigate('/')}>
          Return to Home
        </Button>
      </Card>
    </Container>
  );

  return (
    <div className="bg-animated-gradient d-flex flex-column vh-100">
      {/* Header */}
      <Navbar className="glass-card border-bottom border-white px-3 flex-shrink-0 d-flex justify-content-between align-items-center" style={{ borderRadius: '0 0 1rem 1rem', margin: '0 10px' }}>
        <div className="d-flex align-items-center gap-3">
          <Button variant="light" onClick={() => navigate('/')} className="rounded-circle p-2 shadow-sm d-flex justify-content-center align-items-center" style={{ width: '40px', height: '40px' }}>
            <FaArrowLeft size={16} className="text-primary" />
          </Button>
          <div>
            <h5 className="mb-0 fw-bold text-dark d-flex align-items-center">
              <FaLock className="text-success me-2" size={14} />
              Room: <span className="font-monospace ms-2 text-primary">{roomId}</span>
            </h5>
            <small className="text-muted fw-bold d-block" style={{ fontSize: '11px' }}>E2E Encrypted</small>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
            <Button 
                variant="primary" 
                size="sm" 
                className="rounded-pill d-flex align-items-center gap-2 shadow-sm px-3"
                onClick={() => setShowQrModal(true)}
            >
                <FaQrcode /> Share
            </Button>
            <Button 
                variant="light" 
                size="sm" 
                className="rounded-pill d-flex align-items-center gap-2 shadow-sm border px-3"
                onClick={() => {
                    setTempName(username);
                    setShowNameModal(true);
                }}
            >
                <FaUserCircle /> <span className="d-none d-md-inline">{username}</span>
            </Button>
            <Badge bg="white" text="danger" className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm border">
                <FaClock /> {timeLeft}
            </Badge>
        </div>
      </Navbar>

      {/* Chat Area */}
      <div className="flex-grow-1 overflow-auto p-3" style={{ scrollBehavior: 'smooth' }}>
        <Container>
            {messages.length === 0 && (
              <div className="text-center mt-5 text-white-50">
                <FaLock size={48} className="mb-3 opacity-50" />
                <p className="lead fw-bold">This room is End-to-End Encrypted.</p>
                <p className="small">Messages and files are encrypted before leaving your device.</p>
              </div>
            )}
            {messages.map((msg, index) => {
            const isMe = msg.senderId === senderId;
            return (
                <div key={index} className={`d-flex flex-column mb-3 ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                  <div className={`d-flex align-items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <small className="text-white-50 fw-bold" style={{ fontSize: '0.75rem', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                        {msg.senderName || 'Anonymous'}
                    </small>
                  </div>
                  <div 
                    className={`p-3 shadow-sm ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}
                    style={{ maxWidth: '85%' }}
                  >
                    {msg.type === 'text' ? (
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.4' }}>{msg.content}</p>
                    ) : (
                    <div className="d-flex align-items-center gap-3">
                        <div className={`p-3 rounded-circle shadow-sm ${isMe ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                          <FaFileAlt size={20} />
                        </div>
                        <div className="overflow-hidden d-flex flex-column">
                          <div className="fw-bold text-truncate" style={{ maxWidth: '180px' }}>{msg.originalName}</div>
                          <small className="opacity-75">{(msg.size / 1024).toFixed(1)} KB</small>
                          <Button 
                              variant={isMe ? "light" : "primary"} 
                              size="sm" 
                              className="mt-2 rounded-pill d-flex align-items-center justify-content-center gap-1 fw-bold shadow-sm"
                              onClick={() => handleDownloadFile(msg.content, msg.originalName, msg.mimeType, msg._id)}
                              disabled={downloadingFile === msg._id}
                          >
                              {downloadingFile === msg._id ? <Spinner size="sm" animation="border" /> : <><FaDownload size={12}/> Decrypt & Save</>}
                          </Button>
                        </div>
                    </div>
                    )}
                </div>
                <small className="text-white-50 mt-1" style={{ fontSize: '0.7rem' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
                </div>
            );
            })}
            <div ref={messagesEndRef} />
        </Container>
      </div>

      {/* Input Area */}
      <div className="p-3 flex-shrink-0">
        <Container>
          <Card className="glass-card rounded-4 border-0 shadow-lg">
            <Card.Body className="p-2">
              {file && (
              <div className="mb-2 p-2 bg-white bg-opacity-75 border rounded-4 d-flex justify-content-between align-items-center shadow-sm">
                  <div className="d-flex align-items-center gap-2 text-primary fw-bold">
                      <FaFileAlt />
                      <span className="text-truncate" style={{ maxWidth: '200px' }}>{file.name}</span>
                  </div>
                  <Button 
                      variant="link" 
                      size="sm" 
                      className="text-danger p-0 text-decoration-none fw-bolder fs-5"
                      onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      disabled={uploading}
                  >
                      ×
                  </Button>
              </div>
              )}
              <Form onSubmit={handleSendMessage}>
              <InputGroup className="align-items-center">
                  <Button 
                      variant="light" 
                      className="rounded-circle text-primary mx-2 shadow-sm d-flex justify-content-center align-items-center"
                      style={{ width: '40px', height: '40px' }}
                      onClick={() => fileInputRef.current.click()}
                      title="Attach file"
                      disabled={uploading}
                  >
                      <FaPaperclip />
                  </Button>
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      className="d-none" 
                      disabled={uploading}
                  />
                  <Form.Control
                      type="text"
                      placeholder={uploading ? "Encrypting and uploading file..." : "Type a secure message..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={!!file || uploading}
                      className="border-0 bg-transparent shadow-none px-2 fw-medium"
                      style={{ outline: 'none', boxShadow: 'none' }}
                  />
                  <Button 
                      variant="primary" 
                      type="submit"
                      className="rounded-circle ms-2 shadow-sm d-flex justify-content-center align-items-center me-1"
                      style={{ width: '45px', height: '45px' }}
                      disabled={(!newMessage.trim() && !file) || uploading}
                  >
                      {uploading ? <Spinner size="sm" animation="border" variant="light" /> : <FaPaperPlane />}
                  </Button>
              </InputGroup>
              </Form>
            </Card.Body>
          </Card>
        </Container>
      </div>

      {/* Name Change Modal */}
      <Modal show={showNameModal} onHide={() => setShowNameModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Display Name</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control 
            size="lg"
            type="text" 
            placeholder="Enter your name" 
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="rounded-pill px-4"
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="primary" className="w-100 rounded-pill py-2 fw-bold" onClick={handleNameChange} disabled={!tempName.trim()}>
            Save Name
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code Modal */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold text-center w-100">Share Secure Room</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column align-items-center pb-5">
          <div className="p-3 bg-white rounded-4 shadow-sm border mb-4">
            <QRCodeSVG value={window.location.href} size={200} />
          </div>
          <p className="text-center text-muted fw-medium px-4 mb-4">
            Scan this QR code with your mobile device to instantly securely join this room. The encryption key is embedded in the QR code.
          </p>
          <Button 
            variant="outline-primary" 
            className="rounded-pill px-4 fw-bold shadow-sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Secure Link copied to clipboard!');
            }}
          >
            Copy Secure Link
          </Button>
        </Modal.Body>
      </Modal>

    </div>
  );
};

export default Room;
