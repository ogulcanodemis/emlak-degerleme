# Emlak Değerleme Platformu

Bu proje, emlak fiyatlarını analiz eden ve değerleme yapan bir web uygulamasıdır. Hepsiemlak.com'dan emlak verilerini çeker, analiz eder ve kullanıcılara detaylı emlak değerleme raporları sunar.

## Özellikler

- **Emlak Veri Çekme**: Hepsiemlak.com'dan otomatik veri çekme
- **Bölge Analizi**: Mahalle ve ilçe bazında fiyat analizleri
- **Değerleme**: Benzer emlakları baz alarak fiyat tahmini
- **Fiyat Takibi**: Emlak fiyatlarındaki değişimleri takip etme
- **Detaylı Filtreleme**: Çeşitli kriterlere göre emlak arama

## Teknolojiler

### Backend
- Python 3.8+
- FastAPI
- PostgreSQL
- SQLAlchemy
- Selenium
- BeautifulSoup4

### Frontend
- React
- Material-UI
- React Query
- Chart.js
- Leaflet

## Kurulum

### Gereksinimler
- Python 3.8 veya üzeri
- Node.js 14 veya üzeri
- PostgreSQL
- Chrome WebDriver

### Veritabanı Kurulumu

1. PostgreSQL'i yükleyin ve çalıştırın
2. Yeni bir veritabanı oluşturun:
```sql
CREATE DATABASE "emlak-degerleme";
```
3. Şema dosyasını uygulayın:
```bash
psql -d emlak-degerleme -f database/schema.sql
```

### Backend Kurulumu

1. Sanal ortam oluşturun ve aktive edin:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Bağımlılıkları yükleyin:
```bash
cd backend
pip install -r requirements.txt
```

3. .env dosyasını oluşturun:
```
DATABASE_URL=postgresql://kullanici:sifre@localhost/emlak-degerleme
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
```

4. Backend'i çalıştırın:
```bash
uvicorn main:app --reload
```

### Frontend Kurulumu

1. Bağımlılıkları yükleyin:
```bash
cd frontend
npm install
```

2. Frontend'i çalıştırın:
```bash
npm start
```

## Kullanım

1. Frontend'i `http://localhost:3000` adresinden açın
2. "Yeni İlanları Ekle" bölümünden Hepsiemlak URL'si girin
3. Verilerin çekilmesini bekleyin
4. "Emlak Arama", "Bölge Analizi" veya "Değerleme" özelliklerini kullanın

## API Endpoints

### Emlak İşlemleri
- `POST /scrape/`: Yeni emlak verilerini çek
- `GET /properties/`: Emlak listesi
- `GET /properties/{id}`: Emlak detayı
- `GET /area-statistics/`: Bölge istatistikleri
- `GET /property-trends/{id}`: Emlak fiyat geçmişi

### Konum İşlemleri
- `GET /locations/cities`: Şehir listesi
- `GET /locations/districts`: İlçe listesi
- `GET /locations/neighborhoods`: Mahalle listesi

### Değerleme İşlemleri
- `POST /valuation/estimate`: Emlak değeri tahmini

## Katkıda Bulunma

1. Bu repository'yi fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: Açıklama'`)
4. Branch'inizi push edin (`git push origin feature/yeniOzellik`)
5. Pull Request oluşturun

## İletişim

Proje sorumlusu: [Oğulcan İzzet Ödemiş](mailto:ogulcan.odemis28@gmail.com) 
linkedin: [ogulcanodemis](https://www.linkedin.com/in/ogulcanodemiss/)