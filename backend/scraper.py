from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import random
from typing import List, Dict, Optional
import logging
import asyncio
from databases import Database
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/emlak_db")
database = Database(DATABASE_URL)

class HepsiEmlakScraper:
    def __init__(self):
        self.setup_driver()

    def setup_driver(self):
        """WebDriver'ı yapılandır"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--start-maximized")
            chrome_options.add_argument('--lang=tr')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # User agent
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            self.driver = webdriver.Chrome(options=chrome_options)
            
            # Anti-bot tespiti için JavaScript
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            self.wait = WebDriverWait(self.driver, 30)
            logger.info("WebDriver başarıyla başlatıldı")
            
        except Exception as e:
            logger.error(f"Driver başlatılamadı: {str(e)}")
            raise

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if hasattr(self, 'driver'):
            self.driver.quit()
            logger.info("WebDriver kapatıldı")

    def get_page_source(self, url: str) -> Optional[str]:
        """Web sayfasının kaynak kodunu al"""
        try:
            logger.info(f"Sayfa yükleniyor: {url}")
            
            self.driver.get(url)
            time.sleep(5)
            
            try:
                cookie_button = self.wait.until(EC.element_to_be_clickable((
                    By.CSS_SELECTOR, "button#onetrust-accept-btn-handler"
                )))
                cookie_button.click()
                logger.info("Çerezler kabul edildi")
                time.sleep(2)
            except Exception as e:
                logger.warning(f"Çerez butonu bulunamadı: {str(e)}")
            
            try:
                # Sayfa boş mu kontrol et
                no_result = self.driver.find_elements(By.CSS_SELECTOR, '.no-result-wrapper, .no-result')
                if no_result:
                    logger.info("Bu sayfada sonuç bulunamadı")
                    return None

                # Sayfa yüklenirken hata var mı kontrol et
                error_page = self.driver.find_elements(By.CSS_SELECTOR, '.error-page, .error-content')
                if error_page:
                    logger.info("Sayfa yüklenirken hata oluştu")
                    return None

                # Sayfalama kontrolü
                pagination = self.driver.find_elements(By.CSS_SELECTOR, '.he-pagination ul li')
                if pagination:
                    # Son sayfa numarasını bul
                    last_page = 1
                    for page_item in pagination:
                        try:
                            page_num = int(page_item.text.strip())
                            last_page = max(last_page, page_num)
                        except (ValueError, AttributeError):
                            continue
                    
                    # Mevcut sayfa numarasını URL'den al
                    current_page = 1
                    if 'page=' in url:
                        try:
                            current_page = int(url.split('page=')[1])
                        except (ValueError, IndexError):
                            current_page = 1
                    
                    logger.info(f"Mevcut sayfa: {current_page}, Toplam sayfa: {last_page}")
                    
                    # Eğer mevcut sayfa, son sayfadan büyükse None döndür
                    if current_page > last_page:
                        logger.info(f"Sayfa {current_page} mevcut değil. Son sayfa: {last_page}")
                        return None

                # İlan listesi container'ını bekle
                container = self.wait.until(EC.presence_of_element_located((
                    By.CSS_SELECTOR, 'ul.list-items-container'
                )))
                
                # İlanları kontrol et
                items = container.find_elements(By.CSS_SELECTOR, 'li.listing-item')
                item_count = len(items)
                logger.info(f"İlanlar yüklendi: {item_count} adet")
                
                if item_count == 0:
                    logger.info("Sayfada ilan bulunamadı")
                    return None
                
                # Sayfanın sonuna kadar scroll yap
                self.driver.execute_script("""
                    window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: 'smooth'
                    });
                """)
                time.sleep(3)
                
                # Scroll sonrası ilan sayısını tekrar kontrol et
                final_items = container.find_elements(By.CSS_SELECTOR, 'li.listing-item')
                final_count = len(final_items)
                
                if final_count == 0:
                    logger.info("Scroll sonrası ilan bulunamadı")
                    return None
                
                logger.info(f"Toplam ilan sayısı: {final_count}")
                
                # Sayfa kaynağını döndür
                return self.driver.page_source
                
            except Exception as e:
                logger.error(f"Sayfa yüklenirken hata: {str(e)}")
                return None
            
        except Exception as e:
            logger.error(f"Sayfa kaynağı alınırken hata: {str(e)}")
            return None

    def parse_listings(self, html: str) -> List[Dict]:
        """HTML içeriğinden ilanları parse et"""
        listings = []
        soup = BeautifulSoup(html, 'html.parser')
        
        container = soup.select_one('ul.list-items-container')
        if not container:
            logger.error("İlan listesi container'ı bulunamadı")
            return []
        
        listing_items = container.select('li.listing-item')
        if not listing_items:
            logger.info("Sayfada ilan bulunamadı")
            return []
            
        logger.info(f"Bulunan ilan sayısı: {len(listing_items)}")
        
        selenium_items = self.driver.find_elements(By.CSS_SELECTOR, 'li.listing-item')
        
        for idx, (item, selenium_item) in enumerate(zip(listing_items, selenium_items)):
            try:
                listing = {}
                
                title = item.select_one('h3')
                if title:
                    listing['title'] = title.text.strip()
                
                price_elem = item.select_one('span.list-view-price')
                if price_elem:
                    price = price_elem.text.strip()
                    currency = price_elem.select_one('span.currency')
                    currency_text = currency.text.strip() if currency else 'TL'
                    listing['price'] = price
                    listing['currency'] = currency_text
                
                location = item.select_one('span.list-view-location')
                if location:
                    listing['location'] = location.text.strip()
                
                link = item.select_one('a[href*="/istanbul-"]')
                if link and link.get('href'):
                    listing['listing_url'] = f"https://www.hepsiemlak.com{link['href']}"
                
                img = item.select_one('img.list-view-image')
                if img and img.get('src'):
                    listing['image_url'] = img['src']
                
                features = []
                
                prop_type = item.select_one('span.left')
                if prop_type:
                    listing['property_type'] = prop_type.text.strip()
                    features.append(prop_type.text.strip())
                
                specs = item.select_one('span.right.celly')
                if specs:
                    room_count = specs.select_one('span.houseRoomCount')
                    if room_count:
                        listing['room_count'] = room_count.text.strip()
                    
                    square_meter = specs.select_one('span.squareMeter')
                    if square_meter:
                        listing['square_meters'] = float(square_meter.text.strip().replace('m²', ''))
                    
                    building_age = specs.select_one('span.buildingAge')
                    if building_age:
                        listing['building_age'] = int(building_age.text.strip().replace('Yaşında', ''))
                    
                    floor = specs.select_one('span.floortype')
                    if floor:
                        listing['floor'] = floor.text.strip()
                
                listing['features'] = features
                
                office = item.select_one('p.listing-card--owner-info__firm-name')
                if office:
                    listing['agency_name'] = office.text.strip()
                
                office_logo = item.select_one('img.branded-image')
                if office_logo and office_logo.get('src'):
                    listing['agency_logo_url'] = office_logo['src']
                
                office_link = item.select_one('a[href*="/emlak-ofisi/"]')
                if office_link and office_link.get('href'):
                    listing['agency_url'] = f"https://www.hepsiemlak.com{office_link['href']}"

                try:
                    phone_button = selenium_item.find_element(By.CSS_SELECTOR, 'button.action-telephone')
                    self.driver.execute_script("arguments[0].click();", phone_button)
                    time.sleep(2)

                    phone_container = selenium_item.find_element(By.CSS_SELECTOR, 'div.list-phone-container')
                    
                    consultant_name = phone_container.find_element(By.CSS_SELECTOR, 'span.phone-consultant-name').text.strip()
                    listing['agent_name'] = consultant_name

                    listing_id = phone_container.find_element(By.CSS_SELECTOR, 'span.phone-listing-id').text.strip()
                    listing['listing_number'] = listing_id.replace('İlan No:', '').strip()

                    phone_numbers = []
                    phone_elements = phone_container.find_elements(By.CSS_SELECTOR, 'ul.list-phone-numbers li a')
                    for phone_elem in phone_elements:
                        phone_number = phone_elem.text.strip()
                        if phone_number:
                            phone_numbers.append(phone_number)
                    
                    listing['agent_phone'] = phone_numbers

                    close_button = phone_container.find_element(By.CSS_SELECTOR, 'a.close-list-phone-wrapper')
                    self.driver.execute_script("arguments[0].click();", close_button)
                    time.sleep(1)

                except Exception as e:
                    logger.error(f"Telefon numaraları alınırken hata: {str(e)}")
                    listing['agent_phone'] = []
                    listing['agent_name'] = ""
                    listing['listing_number'] = ""
                
                if listing:
                    listings.append(listing)
                
            except Exception as e:
                logger.error(f"İlan parse edilirken hata: {str(e)}")
                continue
        
        return listings

    def parse_location(self, location: str) -> tuple:
        """Konum bilgisini parçalara ayır"""
        parts = location.split('/')
        city = parts[0].strip() if len(parts) > 0 else None
        district = parts[1].strip() if len(parts) > 1 else None
        neighborhood = parts[2].replace('Mah.', '').strip() if len(parts) > 2 else None
        return city, district, neighborhood

    def parse_price(self, price_str: str) -> tuple:
        """Fiyat bilgisini temizle"""
        price = price_str.replace('TL', '').replace('.', '').strip()
        try:
            return float(price), 'TL'
        except ValueError:
            return None, None

    async def save_listing(self, listing: dict) -> int:
        """İlan verilerini veritabanına kaydet"""
        try:
            city, district, neighborhood = self.parse_location(listing.get('location', ''))
            
            # Fiyat bilgilerini parse et
            price_str = listing.get('price', '0').replace('.', '').replace('TL', '').strip()
            try:
                price = float(price_str)
            except ValueError:
                price = 0
            
            # m² başına fiyat hesapla
            square_meters = listing.get('square_meters', 0)
            price_per_sqm = price / square_meters if price and square_meters else None

            # Telefon numaralarını JSON string'e çevir
            phone_numbers = listing.get('agent_phone', [])
            phone_numbers_json = json.dumps(phone_numbers)

            # Bina yaşını düzelt
            building_age = listing.get('building_age')
            if isinstance(building_age, str):
                if 'Sıfır' in building_age:
                    building_age = 0
                else:
                    try:
                        building_age = int(building_age.replace('Yaşında', '').strip())
                    except (ValueError, AttributeError):
                        building_age = None

            # Listing number kontrolü
            listing_number = listing.get('listing_number')
            if not listing_number:
                logger.warning("İlan numarası bulunamadı, kayıt atlanıyor")
                return None

            query = """
                INSERT INTO properties (
                    title, price, currency, city, district, neighborhood,
                    square_meters, building_age, property_type, listing_number,
                    agency_name, agency_logo_url, agency_url, agent_name,
                    agent_phone, image_url, listing_url, price_per_sqm
                ) VALUES (
                    :title, :price, :currency, :city, :district, :neighborhood,
                    :square_meters, :building_age, :property_type, :listing_number,
                    :agency_name, :agency_logo_url, :agency_url, :agent_name,
                    :agent_phone, :image_url, :listing_url, :price_per_sqm
                )
                ON CONFLICT (listing_number) DO UPDATE SET
                    price = EXCLUDED.price,
                    price_per_sqm = EXCLUDED.price_per_sqm,
                    agent_phone = EXCLUDED.agent_phone,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
            """

            values = {
                'title': listing.get('title'),
                'price': price,
                'currency': listing.get('currency', 'TL'),
                'city': city,
                'district': district,
                'neighborhood': neighborhood,
                'square_meters': listing.get('square_meters'),
                'building_age': building_age,
                'property_type': listing.get('property_type'),
                'listing_number': listing_number,
                'agency_name': listing.get('agency_name'),
                'agency_logo_url': listing.get('agency_logo_url'),
                'agency_url': listing.get('agency_url'),
                'agent_name': listing.get('agent_name'),
                'agent_phone': phone_numbers_json,
                'image_url': listing.get('image_url'),
                'listing_url': listing.get('listing_url'),
                'price_per_sqm': price_per_sqm
            }

            try:
                result = await database.fetch_one(query, values)
                if result:
                    logger.info(f"İlan kaydedildi: ID {result['id']}")
                    
                    # Fiyat geçmişini kaydet
                    await self.save_price_history(result['id'], price)
                    
                    # Bölge istatistiklerini güncelle
                    await self.update_area_statistics(city, district, neighborhood)
                    
                    return result['id']
            except Exception as db_error:
                logger.error(f"Veritabanı hatası: {str(db_error)}")
                return None

            return None

        except Exception as e:
            logger.error(f"İlan kaydedilirken hata oluştu: {str(e)}")
            return None

    async def save_price_history(self, property_id: int, price: float):
        """Fiyat geçmişini kaydet"""
        query = """
            INSERT INTO price_history (property_id, price)
            VALUES (:property_id, :price)
        """
        try:
            await database.execute(query, {
                'property_id': property_id,
                'price': price
            })
            logger.info(f"Fiyat geçmişi kaydedildi: Property ID {property_id}")
        except Exception as e:
            logger.error(f"Fiyat geçmişi kaydedilirken hata: {str(e)}")

    async def update_area_statistics(self, city: str, district: str, neighborhood: str):
        """Bölge istatistiklerini güncelle"""
        try:
            query = """
                INSERT INTO area_statistics (
                    city, district, neighborhood,
                    avg_price_per_sqm, avg_property_age,
                    total_listings, price_trend_6m, price_trend_1y
                )
                SELECT
                    :city, :district, :neighborhood,
                    AVG(price_per_sqm),
                    AVG(building_age),
                    COUNT(*),
                    0,  -- price_trend_6m will be calculated separately
                    0   -- price_trend_1y will be calculated separately
                FROM properties
                WHERE
                    city = :city AND
                    district = :district AND
                    neighborhood = :neighborhood
                ON CONFLICT (city, district, neighborhood) DO UPDATE SET
                    avg_price_per_sqm = EXCLUDED.avg_price_per_sqm,
                    avg_property_age = EXCLUDED.avg_property_age,
                    total_listings = EXCLUDED.total_listings,
                    updated_at = CURRENT_TIMESTAMP
            """
            
            await database.execute(query, {
                'city': city,
                'district': district,
                'neighborhood': neighborhood
            })
            
            logger.info(f"Bölge istatistikleri güncellendi: {city}/{district}/{neighborhood}")
            
        except Exception as e:
            logger.error(f"Bölge istatistikleri güncellenirken hata: {str(e)}")

    async def scrape_and_save(self, base_url: str):
        """URL'deki ilanları çek ve kaydet"""
        try:
            await database.connect()
            page = 1
            total_listings = 0
            total_saved = 0
            
            while True:
                # Sayfa URL'sini oluştur
                url = base_url
                if page > 1:
                    if '?' in base_url:
                        url = f"{base_url}&page={page}"
                    else:
                        url = f"{base_url}?page={page}"
                
                logger.info(f"Sayfa {page} taranıyor: {url}")
                
                html = self.get_page_source(url)
                if not html:
                    logger.info(f"Sayfa {page} bulunamadı veya boş. Tarama sonlandırılıyor.")
                    break
                
                listings = self.parse_listings(html)
                if not listings:
                    logger.info(f"Sayfa {page}'de ilan bulunamadı. Tarama sonlandırılıyor.")
                    break
                
                logger.info(f"Sayfa {page}'de {len(listings)} ilan bulundu")
                total_listings += len(listings)
                
                saved_count = 0
                for listing in listings:
                    if await self.save_listing(listing):
                        saved_count += 1
                        total_saved += 1
                
                logger.info(f"Sayfa {page}'de {saved_count} ilan kaydedildi")
                
                if saved_count == 0:
                    logger.info("Hiç ilan kaydedilemedi. Tarama sonlandırılıyor.")
                    break
                
                page += 1
                time.sleep(3)
            
            logger.info(f"Toplam {total_listings} ilan tarandı, {total_saved} ilan kaydedildi")
                
        except Exception as e:
            logger.error(f"Scraping hatası: {str(e)}")
            raise
        finally:
            await database.disconnect()
            if hasattr(self, 'driver'):
                self.driver.quit()
                logger.info("WebDriver kapatıldı")

async def main():
    """Ana fonksiyon"""
    base_url = "https://www.hepsiemlak.com/istanbul-satilik"
    
    with HepsiEmlakScraper() as scraper:
        await scraper.scrape_and_save(base_url)

if __name__ == "__main__":
    asyncio.run(main()) 