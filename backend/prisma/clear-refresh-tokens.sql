-- Eski refresh tokenlarni tozalash (cookie-based auth'ga o'tish migratsiyasi uchun).
-- Bu tokenlar baribir bekor bo'ladi — foydalanuvchilar bir marta qaytadan kiradi.
TRUNCATE TABLE refresh_tokens;
