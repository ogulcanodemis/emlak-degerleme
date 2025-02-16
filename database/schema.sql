-- Emlak verileri için tablo
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    price DECIMAL(15, 2),
    currency VARCHAR(10),
    city VARCHAR(100),
    district VARCHAR(100),
    neighborhood VARCHAR(100),
    square_meters DECIMAL(10, 2),
    building_age INTEGER,
    property_type VARCHAR(100),
    listing_date VARCHAR(100),
    listing_number VARCHAR(100) UNIQUE,
    agency_name VARCHAR(255),
    agency_logo_url TEXT,
    agency_url TEXT,
    agent_name VARCHAR(255),
    agent_phone JSONB,
    image_url TEXT,
    listing_url TEXT UNIQUE,
    price_per_sqm DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Değerleme için önemli metrikler
    predicted_price DECIMAL(15, 2),
    price_trend DECIMAL(5, 2),  -- Son 6 aydaki fiyat değişim yüzdesi
    area_avg_price DECIMAL(15, 2),  -- Bölgedeki ortalama m² fiyatı
    area_price_trend DECIMAL(5, 2),  -- Bölgedeki fiyat trend yüzdesi
    investment_score INTEGER,  -- 0-100 arası yatırım puanı
    location_score INTEGER,  -- 0-100 arası konum puanı
    property_score INTEGER,  -- 0-100 arası emlak puanı
    overall_score INTEGER  -- 0-100 arası genel puan
);

-- Bölge istatistikleri için tablo
CREATE TABLE IF NOT EXISTS area_statistics (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100),
    district VARCHAR(100),
    neighborhood VARCHAR(100),
    avg_price_per_sqm DECIMAL(15, 2),
    avg_property_age DECIMAL(5, 2),
    total_listings INTEGER,
    price_trend_6m DECIMAL(5, 2),
    price_trend_1y DECIMAL(5, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(city, district, neighborhood)
);

-- Fiyat geçmişi için tablo
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    price DECIMAL(15, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Değerleme modeli parametreleri için tablo
CREATE TABLE IF NOT EXISTS valuation_parameters (
    id SERIAL PRIMARY KEY,
    parameter_name VARCHAR(100) UNIQUE,
    weight DECIMAL(5, 2),
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger fonksiyonu - properties tablosu için updated_at güncellemesi
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Properties tablosu için trigger
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Area statistics tablosu için trigger
CREATE TRIGGER update_area_statistics_updated_at
    BEFORE UPDATE ON area_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 