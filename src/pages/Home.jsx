import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserSecret, FaRocket } from 'react-icons/fa';
import { Container, Button, Form, Spinner } from 'react-bootstrap';

const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';

const Home = () => {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/create-room`);
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error('Failed to create room', err);
      alert('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="neu-bg min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <Container>
        <div className="text-center mb-5 neu-text">
          <FaUserSecret className="display-1 mb-4 neu-flat rounded-circle p-4" style={{ fontSize: '100px', color: '#6c7a89' }} />
          <h1 className="fw-bolder mb-3 neu-text" style={{ fontSize: '3.5rem', letterSpacing: '-1px' }}>Share Salad</h1>
          <p className="lead fw-medium mb-5 neu-text" style={{ opacity: 0.8 }}>
            The most secure, ephemeral way to share files and text.
          </p>
          
          <div className="mx-auto" style={{ maxWidth: '400px' }}>
            <Form onSubmit={joinRoom} className="mb-4 position-relative">
              <Form.Control
                size="lg"
                type="text"
                placeholder="Enter Room Code..."
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="neu-pressed border-0 rounded-pill px-4 py-3 fw-medium"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
              <Button
                type="submit"
                disabled={!roomCode.trim()}
                className="neu-convex position-absolute end-0 top-0 bottom-0 m-2 rounded-pill px-4 fw-bold border-0"
              >
                Join
              </Button>
            </Form>

            <div className="d-flex align-items-center my-4">
              <div className="flex-grow-1 border-bottom border-secondary opacity-25"></div>
              <span className="mx-3 text-secondary fw-semibold small">OR</span>
              <div className="flex-grow-1 border-bottom border-secondary opacity-25"></div>
            </div>

            <Button 
              size="lg" 
              className="neu-convex w-100 rounded-pill px-5 py-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2 border-0"
              onClick={createRoom}
              disabled={loading}
            >
              {loading ? (
                  <>
                      <Spinner size="sm" animation="border" className="neu-text" /> Creating...
                  </>
              ) : (
                  <>
                      <FaRocket /> Create Secure Room
                  </>
              )}
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Home;
