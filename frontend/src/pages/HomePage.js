import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MapIcon from '@mui/icons-material/Map';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function HomePage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const features = [
    {
      title: 'Emlak Arama',
      description: 'Detaylı filtrelerle size en uygun emlağı bulun',
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/properties'),
    },
    {
      title: 'Bölge Analizi',
      description: 'Bölgelerin detaylı fiyat ve trend analizleri',
      icon: <MapIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/area-analysis'),
    },
    {
      title: 'Değer Tahmini',
      description: 'Yapay zeka ile emlak değer tahmini',
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/properties'),
    },
  ];

  const handleScrape = async () => {
    if (!url) {
      setNotification({
        open: true,
        message: 'Lütfen bir URL girin',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/scrape/`, {
        url: url,
      });

      setNotification({
        open: true,
        message: `${response.data.message} (${response.data.total_listings || 0} ilan)`,
        severity: 'success',
      });
      
      // URL'yi temizle
      setUrl('');
      
    } catch (error) {
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'Bir hata oluştu',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Emlak Değerleme ve Analiz Platformu
              </Typography>
              <Typography variant="h5" paragraph>
                Yapay zeka destekli emlak değerleme ve bölge analizi ile
                doğru yatırım kararları alın.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => navigate('/properties')}
                sx={{ mt: 2 }}
              >
                Emlakları İncele
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/hero-image.jpg"
                alt="Hero"
                sx={{
                  width: '100%',
                  maxHeight: 400,
                  objectFit: 'cover',
                  borderRadius: 2,
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* URL Scraping Section */}
      <Container maxWidth="lg" sx={{ mb: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Yeni İlanları Ekle
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Hepsiemlak URL"
              variant="outlined"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.hepsiemlak.com/..."
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleScrape}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              {loading ? 'İşleniyor...' : 'İlanları Getir'}
            </Button>
          </Box>
        </Paper>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onClick={feature.action}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 2, color: 'primary.main' }}>
                    {feature.icon}
                  </Box>
                  <Typography gutterBottom variant="h5" component="h2">
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default HomePage; 