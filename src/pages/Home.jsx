import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserSecret, FaShieldAlt, FaRocket, FaClock } from 'react-icons/fa';
import { Container, Button, Row, Col } from 'react-bootstrap';

const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';

const Home = () => {
  const navigate = useNavigate();

  const createRoom = async () => {
    try {
      const res = await axios.post(`${API_URL}/create-room`);
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error('Failed to create room', err);
      alert('Failed to create room');
    }
  };

  return (
    <div className="neu-bg min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <Container>
        <div className="text-center mb-5 neu-text">
          <FaUserSecret className="display-1 mb-4 neu-flat rounded-circle p-4" style={{ fontSize: '120px', color: '#6c7a89' }} />
          <h1 className="fw-bolder mb-3 neu-text" style={{ fontSize: '3.5rem', letterSpacing: '-1px' }}>Share Salad</h1>
          <p className="lead fw-medium mb-5 neu-text" style={{ opacity: 0.8 }}>
            The most secure, ephemeral way to share files and text.
          </p>
          <Button 
            size="lg" 
            className="neu-convex rounded-pill px-5 py-3 fw-bold d-inline-flex align-items-center gap-2 fs-5"
            onClick={createRoom}
          >
            <FaRocket /> Create Secure Room
          </Button>
        </div>

        <Row className="g-4 mt-2">
          <Col md={4}>
            <div className="neu-flat rounded-4 p-4 text-center h-100">
              <FaShieldAlt className="mb-3" size={32} style={{ color: '#6c7a89' }} />
              <h5 className="fw-bold neu-text">Zero-Knowledge E2EE</h5>
              <p className="small mb-0 neu-text" style={{ opacity: 0.8 }}>AES-GCM encryption before data leaves your device.</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="neu-flat rounded-4 p-4 text-center h-100">
              <FaClock className="mb-3" size={32} style={{ color: '#6c7a89' }} />
              <h5 className="fw-bold neu-text">Auto-Destruct</h5>
              <p className="small mb-0 neu-text" style={{ opacity: 0.8 }}>Rooms vanish in 30 minutes. Files in 15 minutes.</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="neu-flat rounded-4 p-4 text-center h-100">
              <FaUserSecret className="mb-3" size={32} style={{ color: '#6c7a89' }} />
              <h5 className="fw-bold neu-text">Absolute Anonymity</h5>
              <p className="small mb-0 neu-text" style={{ opacity: 0.8 }}>No sign-ups. No IP logging. Just purely anonymous sharing.</p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Home;
