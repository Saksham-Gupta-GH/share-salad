import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPaperPlane, FaPaperclip, FaFileAlt, FaArrowLeft, FaClock, FaEdit, FaUserCircle } from 'react-icons/fa';
import { Container, Row, Col, Card, Form, Button, InputGroup, Navbar, Badge, Spinner, Modal } from 'react-bootstrap';

const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';
const BASE_URL = import.meta.env.VITE_API_URL || '';

const buildDownloadUrl = (url, name) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
};

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // User Identity State
  const [senderId] = useState(Math.random().toString(36).substr(2, 9));
  const [username, setUsername] = useState('Anonymous');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');

  const [expiryTime, setExpiryTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchRoom = async () => {
    try {
      const res = await axios.get(`${API_URL}/room/${roomId}`);
      setMessages(res.data.messages);
      
      // Calculate expiry only once if not set
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
    fetchRoom();

    // HTTP Polling every 3 seconds
    const interval = setInterval(() => {
      fetchRoom();
    }, 3000);

    return () => clearInterval(interval);
  }, [roomId, expiryTime]);

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

    if (file) {
      handleFileUpload();
    } else {
      const messageData = {
        roomId,
        type: 'text',
        content: newMessage,
        senderId,
        senderName: username
      };
      setNewMessage('');
      try {
        await axios.post(`${API_URL}/messages`, messageData);
        fetchRoom(); // fetch immediately after sending
      } catch (err) {
        console.error('Failed to send message', err);
      }
    }
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    
    try {
      // 1. Upload file
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // 2. Add message to room
      const messageData = {
        roomId,
        type: 'file',
        content: res.data.url, // URL path
        originalName: res.data.originalName,
        mimeType: res.data.mimeType,
        size: res.data.size,
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
    <div className="d-flex justify-content-center align-items-center vh-100">
      <Spinner animation="border" variant="primary" />
    </div>
  );

  if (roomError) return (
    <Container className="d-flex flex-column justify-content-center align-items-center vh-100">
      <h2 className="text-danger mb-4">{roomError}</h2>
      <Button variant="primary" onClick={() => navigate('/')}>
        Go Home
      </Button>
    </Container>
  );

  return (
    <div className="d-flex flex-column vh-100 bg-light">
      {/* Header */}
      <Navbar bg="white" className="border-bottom shadow-sm px-3 flex-shrink-0">
        <Button variant="link" onClick={() => navigate('/')} className="text-secondary p-0 me-3">
          <FaArrowLeft size={20} />
        </Button>
        <div className="me-auto">
          <h5 className="mb-0 fw-bold">Room: <span className="font-monospace text-primary">{roomId}</span></h5>
          <small className="text-success fw-bold">● Active</small>
        </div>
        <div className="d-flex align-items-center gap-3">
            <Button 
                variant="outline-secondary" 
                size="sm" 
                className="rounded-pill d-flex align-items-center gap-2"
                onClick={() => {
                    setTempName(username);
                    setShowNameModal(true);
                }}
            >
                <FaUserCircle /> {username} <FaEdit />
            </Button>
            <Badge bg="warning" text="dark" className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill">
                <FaClock /> {timeLeft}
            </Badge>
        </div>
      </Navbar>

      {/* Chat Area */}
      <div className="flex-grow-1 overflow-auto p-3" style={{ scrollBehavior: 'smooth' }}>
        <Container>
            {messages.map((msg, index) => {
            const isMe = msg.senderId === senderId;
            return (
                <div key={index} className={`d-flex flex-column mb-3 ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                  <div className={`d-flex align-items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <small className="text-muted fw-bold" style={{ fontSize: '0.75rem' }}>
                        {msg.senderName || 'Anonymous'}
                    </small>
                  </div>
                  <div 
                    className={`p-3 rounded-3 shadow-sm ${
                        isMe ? 'bg-primary text-white' : 'bg-white text-dark border'
                    }`}
                    style={{ 
                        maxWidth: '75%', 
                        borderTopRightRadius: isMe ? '0' : '0.5rem',
                        borderTopLeftRadius: isMe ? '0.5rem' : '0' 
                    }}
                  >
                    {msg.type === 'text' ? (
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                    ) : (
                    <div className="d-flex align-items-center gap-3">
                        <div className={`p-2 rounded ${isMe ? 'bg-white text-primary' : 'bg-light text-secondary'}`}>
                        <FaFileAlt size={24} />
                        </div>
                        <div className="overflow-hidden">
                        <div className="fw-bold text-truncate" style={{ maxWidth: '150px' }}>{msg.originalName}</div>
                        <small className={isMe ? 'text-white-50' : 'text-muted'}>{(msg.size / 1024).toFixed(1)} KB</small>
                        <a 
                            href={buildDownloadUrl(msg.content, msg.originalName)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            download={msg.originalName || undefined}
                            className={`d-block small mt-1 ${isMe ? 'text-white text-decoration-underline' : 'text-primary'}`}
                        >
                            Download
                        </a>
                        </div>
                    </div>
                    )}
                </div>
                <small className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
                </div>
            );
            })}
            <div ref={messagesEndRef} />
        </Container>
      </div>

      {/* Input Area */}
      <div className="bg-white border-top p-3 flex-shrink-0">
        <Container>
            {file && (
            <div className="mb-2 p-2 bg-light border rounded d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2 text-primary">
                    <FaFileAlt />
                    <span className="text-truncate" style={{ maxWidth: '200px' }}>{file.name}</span>
                </div>
                <Button 
                    variant="link" 
                    size="sm" 
                    className="text-danger p-0 text-decoration-none fw-bold"
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
            <InputGroup>
                <Button 
                    variant="outline-secondary" 
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
                    placeholder={uploading ? "Uploading file..." : "Type a message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={!!file || uploading}
                    className="border-secondary"
                />
                <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={(!newMessage.trim() && !file) || uploading}
                >
                    {uploading ? <Spinner size="sm" animation="border" /> : <FaPaperPlane />}
                </Button>
            </InputGroup>
            </Form>
        </Container>
      </div>

      {/* Name Change Modal */}
      <Modal show={showNameModal} onHide={() => setShowNameModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Your Name</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Display Name</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Enter your name" 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNameModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleNameChange} disabled={!tempName.trim()}>
            Save Name
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default Room;
