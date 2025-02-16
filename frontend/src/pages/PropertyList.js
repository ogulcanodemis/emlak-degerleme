import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  TextField,
  MenuItem,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Square as SquareIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function PropertyList() {
  const [filters, setFilters] = useState({
    city: '',
    district: '',
    minPrice: '',
    maxPrice: '',
    minSize: '',
    maxSize: '',
    propertyType: '',
  });

  // Fetch properties with filters
  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.district) params.append('district', filters.district);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.minSize) params.append('min_size', filters.minSize);
      if (filters.maxSize) params.append('max_size', filters.maxSize);
      if (filters.propertyType) params.append('property_type', filters.propertyType);

      const response = await axios.get(`${API_URL}/properties/?${params.toString()}`);
      return response.data;
    },
  });

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filtreler
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Şehir"
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              select
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="istanbul">İstanbul</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="İlçe"
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
              select
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="besiktas">Beşiktaş</MenuItem>
              <MenuItem value="kadikoy">Kadıköy</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Min. Fiyat"
              name="minPrice"
              type="number"
              value={filters.minPrice}
              onChange={handleFilterChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Max. Fiyat"
              name="maxPrice"
              type="number"
              value={filters.maxPrice}
              onChange={handleFilterChange}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Property List */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {properties?.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
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
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={property.image_url || '/placeholder.jpg'}
                  alt={property.title}
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="h2" noWrap>
                    {property.title}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
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
                    {property.building_age !== null && (
                      <Chip
                        icon={<TimerIcon />}
                        label={property.building_age === 0 ? 'Sıfır Bina' : `${property.building_age} Yaşında`}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    )}
                  </Box>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {formatPrice(property.price)}
                    </Typography>
                    {property.price_per_sqm && (
                      <Typography variant="body2" color="text.secondary">
                        m² Fiyatı: {formatPrice(property.price_per_sqm)}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {property.agency_name}
                    </Typography>
                    {property.agent_phone?.length > 0 && (
                      <Tooltip title={property.agent_phone[0]}>
                        <IconButton size="small" color="primary">
                          <PhoneIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default PropertyList; 