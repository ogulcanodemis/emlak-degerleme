import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import {
  Home as HomeIcon,
  LocationOn as LocationIcon,
  Square as SquareIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function PropertyValuation() {
  const [formData, setFormData] = useState({
    city: '',
    district: '',
    neighborhood: '',
    square_meters: '',
    building_age: '',
    property_type: '',
    room_count: '',
    floor: '',
    total_floors: '',
  });

  const [valuationResult, setValuationResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Şehirleri getir
  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/locations/cities`);
      return response.data;
    },
  });

  // İlçeleri getir
  const { data: districts } = useQuery({
    queryKey: ['districts', formData.city],
    queryFn: async () => {
      if (!formData.city) return [];
      const response = await axios.get(`${API_URL}/locations/districts?city=${formData.city}`);
      return response.data;
    },
    enabled: !!formData.city,
  });

  // Mahalleleri getir
  const { data: neighborhoods } = useQuery({
    queryKey: ['neighborhoods', formData.city, formData.district],
    queryFn: async () => {
      if (!formData.city || !formData.district) return [];
      const response = await axios.get(
        `${API_URL}/locations/neighborhoods?city=${formData.city}&district=${formData.district}`
      );
      return response.data;
    },
    enabled: !!formData.city && !!formData.district,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      // İl değiştiğinde ilçe ve mahalleyi sıfırla
      if (name === 'city') {
        newData.district = '';
        newData.neighborhood = '';
      }
      
      // İlçe değiştiğinde mahalleyi sıfırla
      if (name === 'district') {
        newData.neighborhood = '';
      }
      
      return newData;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/valuation/estimate`, {
        ...formData,
        square_meters: parseFloat(formData.square_meters),
        building_age: parseInt(formData.building_age),
        floor: formData.floor ? parseInt(formData.floor) : null,
        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
      });

      setValuationResult(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Değerleme hesaplanırken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Emlak Değerleme
      </Typography>
      <Typography variant="body1" paragraph>
        Evinizin güncel piyasa değerini öğrenmek için aşağıdaki formu doldurun.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="İl"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    select
                    required
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    {cities?.map((city) => (
                      <MenuItem key={city.value} value={city.value}>
                        {city.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="İlçe"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    select
                    required
                    disabled={!formData.city}
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    {districts?.map((district) => (
                      <MenuItem key={district.value} value={district.value}>
                        {district.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Mahalle"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleChange}
                    select
                    required
                    disabled={!formData.district}
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    {neighborhoods?.map((neighborhood) => (
                      <MenuItem key={neighborhood.value} value={neighborhood.value}>
                        {neighborhood.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Metrekare"
                    name="square_meters"
                    type="number"
                    value={formData.square_meters}
                    onChange={handleChange}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bina Yaşı"
                    name="building_age"
                    type="number"
                    value={formData.building_age}
                    onChange={handleChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Emlak Tipi"
                    name="property_type"
                    value={formData.property_type}
                    onChange={handleChange}
                    select
                    required
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    <MenuItem value="Daire">Daire</MenuItem>
                    <MenuItem value="Müstakil Ev">Müstakil Ev</MenuItem>
                    <MenuItem value="Villa">Villa</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Oda Sayısı"
                    name="room_count"
                    value={formData.room_count}
                    onChange={handleChange}
                    select
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    <MenuItem value="1+1">1+1</MenuItem>
                    <MenuItem value="2+1">2+1</MenuItem>
                    <MenuItem value="3+1">3+1</MenuItem>
                    <MenuItem value="4+1">4+1</MenuItem>
                    <MenuItem value="5+1">5+1</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Bulunduğu Kat"
                    name="floor"
                    type="number"
                    value={formData.floor}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Toplam Kat"
                    name="total_floors"
                    type="number"
                    value={formData.total_floors}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Değerleme Yap'
                    )}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        {/* Sonuçlar */}
        {valuationResult && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Değerleme Sonucu
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h3" color="primary" gutterBottom>
                  {formatPrice(valuationResult.estimated_price)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tahmini değer aralığı:{' '}
                  {formatPrice(valuationResult.price_range[0])} -{' '}
                  {formatPrice(valuationResult.price_range[1])}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Güven Skoru
                </Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={valuationResult.confidence_score}
                    size={60}
                    thickness={4}
                    color={
                      valuationResult.confidence_score > 70
                        ? 'success'
                        : valuationResult.confidence_score > 40
                        ? 'warning'
                        : 'error'
                    }
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
                      {valuationResult.confidence_score}%
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Bölge İstatistikleri
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Ortalama m² Fiyatı
                  </Typography>
                  <Typography variant="h6">
                    {formatPrice(valuationResult.area_stats.avg_price_per_sqm)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Toplam İlan Sayısı
                  </Typography>
                  <Typography variant="h6">
                    {valuationResult.area_stats.total_listings}
                  </Typography>
                </Grid>
              </Grid>

              {valuationResult.similar_properties.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Benzer İlanlar
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Bölgedeki benzer özellikteki emlak ilanları
                  </Typography>
                  <Grid container spacing={2}>
                    {valuationResult.similar_properties.map((property) => (
                      <Grid item xs={12} key={property.id}>
                        <Card variant="outlined" sx={{ 
                          '&:hover': {
                            boxShadow: 2,
                            cursor: 'pointer'
                          }
                        }}>
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              {property.image_url && (
                                <Grid item xs={12} sm={4}>
                                  <Box
                                    component="img"
                                    src={property.image_url}
                                    alt={property.title}
                                    sx={{
                                      width: '100%',
                                      height: 120,
                                      objectFit: 'cover',
                                      borderRadius: 1
                                    }}
                                  />
                                </Grid>
                              )}
                              <Grid item xs={12} sm={property.image_url ? 8 : 12}>
                                <Typography variant="subtitle1" gutterBottom>
                                  {property.title}
                                </Typography>
                                <Typography variant="h6" color="primary" gutterBottom>
                                  {formatPrice(property.price)}
                                </Typography>
                                <Box sx={{ mb: 1 }}>
                                  <Chip
                                    icon={<LocationIcon />}
                                    label={`${property.district}, ${property.neighborhood}`}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                  />
                                  <Chip
                                    icon={<HomeIcon />}
                                    label={property.property_type}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                  />
                                  <Chip
                                    icon={<SquareIcon />}
                                    label={`${property.square_meters} m²`}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                  />
                                  <Chip
                                    icon={<TimerIcon />}
                                    label={property.building_age === 0 ? 'Sıfır Bina' : `${property.building_age} Yaşında`}
                                    size="small"
                                    sx={{ mb: 1 }}
                                  />
                                </Box>
                                {property.price_per_sqm && (
                                  <Typography variant="body2" color="text.secondary">
                                    m² Fiyatı: {formatPrice(property.price_per_sqm)}
                                  </Typography>
                                )}
                                {property.agency_name && (
                                  <Typography variant="body2" color="text.secondary">
                                    {property.agency_name}
                                  </Typography>
                                )}
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default PropertyValuation; 