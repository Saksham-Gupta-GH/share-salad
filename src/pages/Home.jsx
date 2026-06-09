import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserSecret, FaLock } from 'react-icons/fa';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';

const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';

const Home = () => {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/create-room`);
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error(err);
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
    <div className="bg-animated-gradient min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <Container>
        <div className="text-center mb-5 text-white">
          <FaUserSecret className="display-1 mb-3 shadow-sm rounded-circle p-2 bg-white text-primary" style={{ fontSize: '100px' }} />
          <h1 className="fw-bolder mb-3" style={{ fontSize: '3.5rem', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>Share Salad</h1>
          <p className="lead fw-medium" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.2)' }}>
            <FaLock className="me-2 mb-1" />
            End-to-End Encrypted File Sharing
          </p>
        </div>

        <Row className="w-100 justify-content-center mx-auto">
          <Col md={8} lg={6} xl={5}>
            <Card className="glass-card rounded-4 border-0">
              <Card.Body className="p-5">
                <Form onSubmit={joinRoom}>
                  <Form.Group className="mb-4 position-relative">
                    <Form.Control
                      size="lg"
                      type="text"
                      placeholder="Enter Room Code..."
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      className="rounded-pill px-4 shadow-sm border-0 py-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={!roomCode.trim()}
                      className="position-absolute end-0 top-0 bottom-0 m-2 rounded-pill px-4 fw-bold shadow-sm"
                    >
                      Join
                    </Button>
                  </Form.Group>
                </Form>

                <div className="d-flex align-items-center my-4">
                  <div className="flex-grow-1 border-bottom border-secondary opacity-25"></div>
                  <span className="mx-3 text-secondary fw-semibold small">OR</span>
                  <div className="flex-grow-1 border-bottom border-secondary opacity-25"></div>
                </div>

                <div className="text-center">
                  <Button
                    variant="dark"
                    size="lg"
                    onClick={createRoom}
                    disabled={loading}
                    className="w-100 rounded-pill py-3 fw-bold shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Creating Secure Room...
                      </>
                    ) : (
                      'Create New Room'
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <div className="fixed-bottom text-center pb-4 text-white-50 small fw-medium">
        Zero-Knowledge Security • 30-Minute Self-Destruct
      </div>
    </div>
  );
};

export default Home;
