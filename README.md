Programın Çalışma Şekli

Bu program, OLX üzerinden belirlenen filtrelere göre ilanları toplar.

Toplanan ilanlar öncelikle güncel tarihe göre filtrelenir ve tekrar edenler temizlenir.

Veritabanı kullanmak gereksiz maliyet oluşturacağından, ilanlar listings.json dosyasına obje olarak kaydedilir.

Program gün içinde birden fazla kez çalıştırıldığında, daha önce gönderilen ilanlarla yeni gelen ilanlar karşılaştırılır ve yalnızca o gün içerisinde daha önce gönderilmemiş olan ilanlar gönderilir.

Not: listings.json dosyasının belirli aralıklarla temizlenmesini öneririm.
