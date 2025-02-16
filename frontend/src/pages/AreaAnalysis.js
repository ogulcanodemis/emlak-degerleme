import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import 'leaflet/dist/leaflet.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function AreaAnalysis() {
  const [selectedArea, setSelectedArea] = useState({
    city: '',
    district: '',
  });

  // Fetch area statistics
  const { data: areaStats, isLoading } = useQuery({
    queryKey: ['area-statistics', selectedArea],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedArea.city) params.append('city', selectedArea.city);
      if (selectedArea.district) params.append('district', selectedArea.district);
      
      const response = await axios.get(`${API_URL}/area-statistics/?${params.toString()}`);
      return response.data;
    },
    enabled: Boolean(selectedArea.city),
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAreaChange = (event) => {
    const { name, value } = event.target;
    setSelectedArea((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Price trend chart data
  const trendChartData = {
    labels: ['6 ay önce', '5 ay önce', '4 ay önce', '3 ay önce', '2 ay önce', '1 ay önce', 'Şimdi'],
    datasets: [
      {
        label: 'Ortalama m² Fiyatı',
        data: areaStats?.[0]?.price_trend_6m || [],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Area Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Şehir"
              name="city"
              value={selectedArea.city}
              onChange={handleAreaChange}
              select
            >
              <MenuItem value="istanbul">İstanbul</MenuItem>
              {/* Add more cities */}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="İlçe"
              name="district"
              value={selectedArea.district}
              onChange={handleAreaChange}
              select
              disabled={!selectedArea.city}
            >
              <MenuItem value="">Tümü</MenuItem>
              {/* Add districts based on selected city */}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Map */}
          <Grid item xs={12}>
            <Paper sx={{ height: 400, mb: 4 }}>
              <MapContainer
                center={[41.0082, 28.9784]} // Istanbul coordinates
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {areaStats?.map((area) => (
                  <Marker
                    key={`${area.district}-${area.neighborhood}`}
                    position={[41.0082, 28.9784]} // Replace with actual coordinates
                  >
                    <Popup>
                      <Typography variant="subtitle2">
                        {area.district}, {area.neighborhood}
                      </Typography>
                      <Typography variant="body2">
                        Ort. m² Fiyatı: {formatPrice(area.avg_price_per_sqm)}
                      </Typography>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </Paper>
          </Grid>

          {/* Statistics */}
          {areaStats?.map((area) => (
            <Grid item xs={12} key={`${area.district}-${area.neighborhood}`}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {area.district} {area.neighborhood && `- ${area.neighborhood}`}
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Ortalama m² Fiyatı
                      </Typography>
                      <Typography variant="h6">
                        {formatPrice(area.avg_price_per_sqm)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Ortalama Bina Yaşı
                      </Typography>
                      <Typography variant="h6">
                        {area.avg_property_age?.toFixed(1)} yıl
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        İlan Sayısı
                      </Typography>
                      <Typography variant="h6">
                        {area.total_listings}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        6 Aylık Değişim
                      </Typography>
                      <Typography
                        variant="h6"
                        color={area.price_trend_6m > 0 ? 'success.main' : 'error.main'}
                      >
                        {area.price_trend_6m > 0 ? '+' : ''}{area.price_trend_6m}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Price Trend Chart */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Fiyat Trendi
                  </Typography>
                  <Line data={trendChartData} />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default AreaAnalysis; 