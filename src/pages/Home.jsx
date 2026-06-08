import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUserSecret } from 'react-icons/fa';
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
    <Container className="d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div className="text-center mb-5">
        <FaUserSecret className="display-1 text-primary mb-3" />
        <h1 className="fw-bold mb-3">Fileshare Anonymous</h1>
        <p className="text-muted lead">
          Share texts and files securely. Rooms expire in 30 minutes.
        </p>
      </div>

      <Row className="w-100 justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              <Form onSubmit={joinRoom}>
                <Form.Group className="mb-3 position-relative">
                  <Form.Control
                    size="lg"
                    type="text"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="rounded-pill px-4"
                  />
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={!roomCode.trim()}
                    className="position-absolute end-0 top-0 bottom-0 m-1 rounded-pill px-4"
                  >
                    Join
                  </Button>
                </Form.Group>
              </Form>

              <div className="text-center mt-4">
                <Button
                  variant="link"
                  onClick={createRoom}
                  disabled={loading}
                  className="text-decoration-none"
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Creating...
                    </>
                  ) : (
                    'Create a new room'
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="fixed-bottom text-center pb-3 text-muted small">
        Secure • Anonymous • Temporary
      </div>
    </Container>
  );
};

export default Home;
