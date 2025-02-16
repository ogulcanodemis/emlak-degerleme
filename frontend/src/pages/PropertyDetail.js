import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  LocationOn,
  Home,
  Square,
  Timer,
  TrendingUp,
  Assessment,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function PropertyDetail() {
  const { id } = useParams();

  // Fetch property details
  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/properties/${id}`);
      return response.data;
    },
  });

  // Fetch property price trends
  const { data: trends } = useQuery({
    queryKey: ['property-trends', id],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/property-trends/${id}`);
      return response.data;
    },
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const priceChartData = {
    labels: trends?.map(t => new Date(t.recorded_at).toLocaleDateString('tr-TR')),
    datasets: [
      {
        label: 'Fiyat Değişimi',
        data: trends?.map(t => t.price),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Main Image */}
          <Paper sx={{ mb: 4, overflow: 'hidden' }}>
            <Box
              component="img"
              src={property.image_url || '/placeholder.jpg'}
              alt={property.title}
              sx={{
                width: '100%',
                height: 400,
                objectFit: 'cover',
              }}
            />
          </Paper>

          {/* Property Details */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              {property.title}
            </Typography>
            <Typography variant="h5" color="primary" gutterBottom>
              {formatPrice(property.price)}
            </Typography>
            
            <Box sx={{ my: 2 }}>
              <Chip
                icon={<LocationOn />}
                label={`${property.district}, ${property.city}`}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                icon={<Home />}
                label={property.property_type}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                icon={<Square />}
                label={`${property.square_meters} m²`}
                sx={{ mr: 1, mb: 1 }}
              />
              {property.building_age && (
                <Chip
                  icon={<Timer />}
                  label={`${property.building_age} Yaşında`}
                  sx={{ mr: 1, mb: 1 }}
                />
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Price Analysis */}
            <Typography variant="h6" gutterBottom>
              Fiyat Analizi
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      m² Fiyatı
                    </Typography>
                    <Typography variant="h6">
                      {formatPrice(property.price_per_sqm)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Bölge Ortalaması
                    </Typography>
                    <Typography variant="h6">
                      {formatPrice(property.area_avg_price)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Price Trend Chart */}
            {trends && trends.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Fiyat Değişimi
                </Typography>
                <Paper sx={{ p: 2 }}>
                  <Line data={priceChartData} />
                </Paper>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          {/* Agent Info */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Emlak Ofisi
            </Typography>
            {property.agency_logo_url && (
              <Box
                component="img"
                src={property.agency_logo_url}
                alt={property.agency_name}
                sx={{ height: 60, mb: 2 }}
              />
            )}
            <Typography variant="body1" gutterBottom>
              {property.agency_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {property.agent_name}
            </Typography>
            {property.agent_phone?.map((phone, index) => (
              <Typography key={index} variant="body2">
                {phone}
              </Typography>
            ))}
          </Paper>

          {/* Property Scores */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Değerlendirme
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Yatırım Puanı
                  </Typography>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-flex',
                      my: 1,
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={property.investment_score || 0}
                      size={60}
                      thickness={4}
                      color="success"
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div">
                        {property.investment_score || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Konum Puanı
                  </Typography>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-flex',
                      my: 1,
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={property.location_score || 0}
                      size={60}
                      thickness={4}
                      color="primary"
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div">
                        {property.location_score || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default PropertyDetail; 