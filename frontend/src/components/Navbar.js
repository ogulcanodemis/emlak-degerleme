import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import SearchIcon from '@mui/icons-material/Search';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalculateIcon from '@mui/icons-material/Calculate';

function Navbar() {
  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              mr: 4,
            }}
          >
            <HomeIcon sx={{ mr: 1 }} />
            Emlak Değerleme
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              component={RouterLink}
              to="/properties"
              startIcon={<ListAltIcon />}
            >
              İlanlar
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/area-analysis"
              startIcon={<MapIcon />}
            >
              Bölge Analizi
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/valuation"
              startIcon={<CalculateIcon />}
            >
              Değerleme
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar; 