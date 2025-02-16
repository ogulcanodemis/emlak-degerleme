from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from databases import Database
from typing import List, Optional
import os
from dotenv import load_dotenv
from pydantic import BaseModel
import logging
from scraper import HepsiEmlakScraper
import asyncio

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Emlak Değerleme API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/emlak_db")

# Initialize database
database = Database(DATABASE_URL)

# Pydantic models
class Property(BaseModel):
    id: Optional[int]
    title: str
    price: float
    currency: str
    city: str
    district: str
    neighborhood: str
    square_meters: float
    building_age: Optional[int]
    property_type: str
    listing_date: Optional[str]
    listing_number: str
    price_per_sqm: float
    predicted_price: Optional[float]
    investment_score: Optional[int]
    location_score: Optional[int]
    property_score: Optional[int]
    overall_score: Optional[int]
    agency_name: Optional[str]
    agent_name: Optional[str]
    agent_phone: Optional[list]
    image_url: Optional[str]
    listing_url: Optional[str]

class AreaStatistics(BaseModel):
    city: str
    district: str
    neighborhood: str
    avg_price_per_sqm: float
    avg_property_age: float
    total_listings: int
    price_trend_6m: float
    price_trend_1y: float

class ScrapeRequest(BaseModel):
    url: str
    description: Optional[str] = None

class ScrapeResponse(BaseModel):
    status: str
    message: str
    total_listings: Optional[int] = None

class LocationResponse(BaseModel):
    value: str
    label: str

class ValuationRequest(BaseModel):
    city: str
    district: str
    neighborhood: str
    square_meters: float
    building_age: int
    property_type: str
    room_count: Optional[str]
    floor: Optional[int]
    total_floors: Optional[int]

class ValuationResponse(BaseModel):
    estimated_price: float
    price_range: tuple[float, float]
    confidence_score: int
    similar_properties: List[Property]
    area_stats: AreaStatistics

@app.on_event("startup")
async def startup():
    await database.connect()
    logger.info("Connected to database")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()
    logger.info("Disconnected from database")

@app.post("/scrape/", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest):
    """Belirtilen URL'den emlak verilerini çek"""
    try:
        scraper = HepsiEmlakScraper()
        await scraper.scrape_and_save(request.url)
        return ScrapeResponse(
            status="success",
            message="Veriler başarıyla çekildi ve kaydedildi",
            total_listings=len(scraper.listings) if hasattr(scraper, 'listings') else None
        )
    except Exception as e:
        logger.error(f"Scraping hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/properties/", response_model=List[Property])
async def get_properties(
    city: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_size: Optional[float] = None,
    max_size: Optional[float] = None,
    property_type: Optional[str] = None,
    limit: int = 100
):
    query = """
    SELECT 
        id, title, price, currency, city, district, neighborhood,
        square_meters, building_age, property_type, 
        COALESCE(listing_date, '') as listing_date,
        listing_number, price_per_sqm, predicted_price,
        investment_score, location_score, property_score,
        overall_score, agency_name, agent_name,
        agent_phone::text as agent_phone, image_url, listing_url
    FROM properties 
    WHERE 1=1
    """
    params = {}
    
    if city:
        query += " AND city = :city"
        params['city'] = city
    if district:
        query += " AND district = :district"
        params['district'] = district
    if min_price:
        query += " AND price >= :min_price"
        params['min_price'] = min_price
    if max_price:
        query += " AND price <= :max_price"
        params['max_price'] = max_price
    if min_size:
        query += " AND square_meters >= :min_size"
        params['min_size'] = min_size
    if max_size:
        query += " AND square_meters <= :max_size"
        params['max_size'] = max_size
    if property_type:
        query += " AND property_type = :property_type"
        params['property_type'] = property_type
    
    query += " ORDER BY created_at DESC LIMIT :limit"
    params['limit'] = limit
    
    try:
        results = await database.fetch_all(query=query, values=params)
        properties = []
        for result in results:
            result_dict = dict(result)
            # Parse agent_phone from JSON string to list
            if result_dict['agent_phone']:
                try:
                    import json
                    result_dict['agent_phone'] = json.loads(result_dict['agent_phone'])
                except:
                    result_dict['agent_phone'] = []
            else:
                result_dict['agent_phone'] = []
            properties.append(Property(**result_dict))
        return properties
    except Exception as e:
        logger.error(f"Error fetching properties: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: int):
    query = """
    SELECT 
        id, title, price, currency, city, district, neighborhood,
        square_meters, building_age, property_type, 
        COALESCE(listing_date, '') as listing_date,
        listing_number, price_per_sqm, predicted_price,
        investment_score, location_score, property_score,
        overall_score, agency_name, agent_name,
        agent_phone::text as agent_phone, image_url, listing_url
    FROM properties 
    WHERE id = :id
    """
    try:
        result = await database.fetch_one(query=query, values={"id": property_id})
        if result:
            result_dict = dict(result)
            if result_dict['agent_phone']:
                try:
                    import json
                    result_dict['agent_phone'] = json.loads(result_dict['agent_phone'])
                except:
                    result_dict['agent_phone'] = []
            else:
                result_dict['agent_phone'] = []
            return Property(**result_dict)
        raise HTTPException(status_code=404, detail="Property not found")
    except Exception as e:
        logger.error(f"Error fetching property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/area-statistics/", response_model=List[AreaStatistics])
async def get_area_statistics(
    city: Optional[str] = None,
    district: Optional[str] = None
):
    query = "SELECT * FROM area_statistics WHERE 1=1"
    params = {}
    
    if city:
        query += " AND city = :city"
        params['city'] = city
    if district:
        query += " AND district = :district"
        params['district'] = district
    
    try:
        results = await database.fetch_all(query=query, values=params)
        return [AreaStatistics(**dict(result)) for result in results]
    except Exception as e:
        logger.error(f"Error fetching area statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/property-trends/{property_id}")
async def get_property_trends(property_id: int):
    query = """
    SELECT price, recorded_at 
    FROM price_history 
    WHERE property_id = :property_id 
    ORDER BY recorded_at DESC
    """
    try:
        results = await database.fetch_all(query=query, values={"property_id": property_id})
        return results
    except Exception as e:
        logger.error(f"Error fetching property trends: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/locations/cities", response_model=List[LocationResponse])
async def get_cities():
    """Veritabanında bulunan şehirleri getir"""
    query = """
    SELECT DISTINCT city 
    FROM properties 
    WHERE city IS NOT NULL 
    ORDER BY city
    """
    try:
        results = await database.fetch_all(query=query)
        return [
            LocationResponse(value=row['city'], label=row['city'])
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching cities: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/locations/districts", response_model=List[LocationResponse])
async def get_districts(city: str):
    """Belirli bir şehirdeki ilçeleri getir"""
    query = """
    SELECT DISTINCT district 
    FROM properties 
    WHERE city = :city AND district IS NOT NULL 
    ORDER BY district
    """
    try:
        results = await database.fetch_all(query=query, values={"city": city})
        return [
            LocationResponse(value=row['district'], label=row['district'])
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching districts: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/locations/neighborhoods", response_model=List[LocationResponse])
async def get_neighborhoods(city: str, district: str):
    """Belirli bir ilçedeki mahalleleri getir"""
    query = """
    SELECT DISTINCT neighborhood 
    FROM properties 
    WHERE city = :city AND district = :district AND neighborhood IS NOT NULL 
    ORDER BY neighborhood
    """
    try:
        results = await database.fetch_all(
            query=query, 
            values={"city": city, "district": district}
        )
        return [
            LocationResponse(value=row['neighborhood'], label=row['neighborhood'])
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching neighborhoods: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error")

@app.post("/valuation/estimate", response_model=ValuationResponse)
async def estimate_property_value(request: ValuationRequest):
    """Emlak değeri tahmini yap"""
    try:
        # Bölgedeki benzer özellikteki emlakları bul
        similar_properties_query = """
        WITH PropertyScores AS (
            SELECT 
                *,
                -- Benzerlik skoru hesapla
                (
                    CASE 
                        -- Metrekare farkı (max 40 puan)
                        WHEN ABS(square_meters - :square_meters) <= 10 THEN 40
                        WHEN ABS(square_meters - :square_meters) <= 20 THEN 30
                        WHEN ABS(square_meters - :square_meters) <= 30 THEN 20
                        WHEN ABS(square_meters - :square_meters) <= 40 THEN 10
                        ELSE 0
                    END +
                    -- Bina yaşı farkı (max 30 puan)
                    CASE 
                        WHEN ABS(building_age - :building_age) <= 2 THEN 30
                        WHEN ABS(building_age - :building_age) <= 5 THEN 20
                        WHEN ABS(building_age - :building_age) <= 10 THEN 10
                        ELSE 0
                    END +
                    -- Aynı mahalle bonus (20 puan)
                    CASE WHEN neighborhood = :neighborhood THEN 20 ELSE 0 END +
                    -- Aynı emlak tipi bonus (10 puan)
                    CASE WHEN property_type = :property_type THEN 10 ELSE 0 END
                ) as similarity_score
            FROM properties
            WHERE 
                city = :city 
                AND district = :district
                AND created_at >= NOW() - INTERVAL '6 months'
                AND price > 0
                AND square_meters > 0
        )
        SELECT *
        FROM PropertyScores
        WHERE similarity_score >= 50  -- En az 50 puan benzerlik
        ORDER BY similarity_score DESC, created_at DESC
        LIMIT 10
        """
        
        similar_properties = await database.fetch_all(
            query=similar_properties_query,
            values={
                "city": request.city,
                "district": request.district,
                "neighborhood": request.neighborhood,
                "square_meters": request.square_meters,
                "building_age": request.building_age,
                "property_type": request.property_type
            }
        )
        
        # Bölge istatistiklerini al
        area_stats_query = """
        WITH NeighborhoodStats AS (
            SELECT 
                AVG(price_per_sqm) as neighborhood_avg_price,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sqm) as neighborhood_median_price,
                COUNT(*) as neighborhood_listings
            FROM properties
            WHERE 
                city = :city 
                AND district = :district
                AND neighborhood = :neighborhood
                AND created_at >= NOW() - INTERVAL '6 months'
        ),
        DistrictStats AS (
            SELECT 
                AVG(price_per_sqm) as district_avg_price,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sqm) as district_median_price,
                COUNT(*) as district_listings
            FROM properties
            WHERE 
                city = :city 
                AND district = :district
                AND created_at >= NOW() - INTERVAL '6 months'
        ),
        PriceTrends AS (
            SELECT 
                AVG(CASE WHEN created_at >= NOW() - INTERVAL '1 month' THEN price_per_sqm END) as last_month_avg,
                AVG(CASE WHEN created_at >= NOW() - INTERVAL '6 months' AND created_at < NOW() - INTERVAL '5 months' THEN price_per_sqm END) as six_months_ago_avg
            FROM properties
            WHERE 
                city = :city 
                AND district = :district
                AND neighborhood = :neighborhood
        )
        SELECT 
            n.*,
            d.*,
            p.*,
            CASE 
                WHEN p.last_month_avg IS NOT NULL AND p.six_months_ago_avg IS NOT NULL 
                THEN ((p.last_month_avg - p.six_months_ago_avg) / p.six_months_ago_avg * 100)
                ELSE 0 
            END as price_trend_6m
        FROM NeighborhoodStats n, DistrictStats d, PriceTrends p
        """
        
        area_stats = await database.fetch_one(
            query=area_stats_query,
            values={
                "city": request.city,
                "district": request.district,
                "neighborhood": request.neighborhood
            }
        )
        
        if not area_stats or not area_stats['neighborhood_avg_price']:
            raise HTTPException(
                status_code=400,
                detail="Bu bölge için yeterli veri bulunmuyor"
            )
        
        # Benzer emlakların fiyatlarını analiz et
        similar_prices = [float(p['price']) for p in similar_properties]
        similar_sqm_prices = [float(p['price_per_sqm']) for p in similar_properties]
        
        if not similar_prices:
            raise HTTPException(
                status_code=400,
                detail="Benzer emlak bulunamadı"
            )
        
        # Temel değer hesaplama
        neighborhood_weight = 0.6
        district_weight = 0.4
        
        base_sqm_price = (
            float(area_stats['neighborhood_avg_price']) * neighborhood_weight +
            float(area_stats['district_avg_price']) * district_weight
        )
        
        # Bina yaşı faktörü
        age_factor = 1.0
        if request.building_age == 0:
            age_factor = 1.15  # Sıfır bina primi
        elif request.building_age < 5:
            age_factor = 1.10
        elif request.building_age < 10:
            age_factor = 1.05
        elif request.building_age > 20:
            age_factor = 0.95
        elif request.building_age > 30:
            age_factor = 0.90
        
        # Metrekare faktörü (büyük dairelerde m² başına fiyat düşer)
        size_factor = 1.0
        if request.square_meters > 200:
            size_factor = 0.90
        elif request.square_meters > 150:
            size_factor = 0.95
        elif request.square_meters < 80:
            size_factor = 1.05
        
        # Tahmini değer hesaplama
        estimated_sqm_price = base_sqm_price * age_factor * size_factor
        estimated_price = estimated_sqm_price * request.square_meters
        
        # Fiyat aralığı hesaplama
        price_range_factor = 0.10  # ±10%
        if len(similar_properties) < 5:
            price_range_factor = 0.15  # Daha az veri varsa aralığı genişlet
        
        price_range = (
            estimated_price * (1 - price_range_factor),
            estimated_price * (1 + price_range_factor)
        )
        
        # Güven skoru hesaplama
        confidence_score = min(
            int(
                # Benzer emlak sayısı (40 puan)
                (min(len(similar_properties), 10) * 4) +
                # Mahalle veri sayısı (30 puan)
                (min(area_stats['neighborhood_listings'], 50) * 0.6) +
                # Fiyat tutarlılığı (30 puan)
                (30 * (1 - (max(similar_sqm_prices) - min(similar_sqm_prices)) / base_sqm_price))
            ),
            100
        )
        
        # Benzer emlakları Property modeline dönüştür
        properties = []
        for prop in similar_properties:
            prop_dict = dict(prop)
            if prop_dict['agent_phone']:
                try:
                    import json
                    prop_dict['agent_phone'] = json.loads(prop_dict['agent_phone'])
                except:
                    prop_dict['agent_phone'] = []
            else:
                prop_dict['agent_phone'] = []
            properties.append(Property(**prop_dict))
        
        return ValuationResponse(
            estimated_price=estimated_price,
            price_range=price_range,
            confidence_score=confidence_score,
            similar_properties=properties,
            area_stats=AreaStatistics(
                city=request.city,
                district=request.district,
                neighborhood=request.neighborhood,
                avg_price_per_sqm=float(area_stats['neighborhood_avg_price']),
                avg_property_age=float(area_stats['neighborhood_median_price']),
                total_listings=int(area_stats['neighborhood_listings']),
                price_trend_6m=float(area_stats['price_trend_6m']),
                price_trend_1y=0  # TODO: 1 yıllık trend eklenecek
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error estimating property value: {str(e)}")
        raise HTTPException(status_code=500, detail="Değerleme hesaplanırken bir hata oluştu") 