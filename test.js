/* Program Calisma Sekli */
/* Olx'den belirleyeceginiz filtrelere gore ilanlari aliyor
   Sonrasinda bunlari guncel tarihe gore filtreliyor ve birbirinin aynisi olan
   ilanlari temizliyor. Gelen ilanlari bir veritabani kullanmak gereksiz harcama 
   olacagi icin bir json dosyasina object olarak kaydediyor. Eger gun icinde birden fazla
   kez calistirilirsa ilk yolladigi ilanlar ile yeni gelenleri karsilastirarak sadece
   gun icinde zaten yollanmamis ilanlari gondeririyor.
   
   NOT: Yollanmis ilanlar(listings.json) dosyasinin arada bir temizlenmesi iyi olur.

*/

import fs from "fs"

const bearer = ''
// api icin Authorization keyi 

const url = ''
// Olx in api endpointi


// Ilk fetch fonksiyonu. Datalar arasindan sectigim kisimlari obje olarak veriyor.
/* Api 40 dan fazla ilan veremedigi icin for loop kullandim her loop cycle inda sayfa
   numarasi 1 artiyor */ 
const fetchTry = async () => {
  let dataArr = [];

  // i burada kac tane sayfadan ilan alicagimizi belirliyor.(ilk sayfa ve 10. sayfadaki butun ilanlar)
  for (let i = 0; i < 10; i++) {
    const pageNumber = i * 40;


    // Ilanlar icin fiyat,konum vb filtreleri
    const payload = {
      query: `query ListingSearchQuery(
        $searchParameters: [SearchParameter!] = {key: "", value: ""}
      ) {
        clientCompatibleListings(searchParameters: $searchParameters) {
          ... on ListingSuccess {
            data { id title url created_time user { name } location { city { name } district { name } } }
          }
        }
      }`,
      variables: {
        searchParameters: [
          { key: "offset", value: `${pageNumber}` },
          { key: "limit", value: "40" },
          { key: "category_id", value: "15" },
          { key: "region_id", value: "2" },
          { key: "city_id", value: "17871" },
          { key: "filter_float_price:to", value: "4000" },
          { key: "filter_float_price:from", value: "1500" },
          { key: "filter_refiners", value: "spell_checker" },
          { key: "suggest_filters", value: "true" },
          { key: "sl", value: "192d4b7a79ax22664bce" },
          { key: "sort_by", value: "created_at:desc" }
        ]
      }
    };


    // Ilk fetch islemi(bize sonradan uzerinde oynayabilmemiz icin dataArr adinda bir array getiriyor)
    // Api icinden alinan ilk bilgiler, Title,id,url,renter,Location,CreatedTime.
    // Ileride daha fazla bilgi gerekirse burdan ayarlanicak.
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        try {
          data.data.clientCompatibleListings.data.forEach(result => {
            dataArr.push({
              Title: result.title,
              id: result.id,
              Url: result.url,
              Renter: result.user.name,
              Location:  result.location.city?.name || "",
              District: result.location.district?.name || "",
              CreatedTime: new Date(result.created_time)
                .toISOString()
                .split("T")[0]
            });
          });
        } catch (err) {
          console.log(err);
        }
      });
  }

  return dataArr;
};



// Fetch fonksiyonundan gelen ilanlarin sadece guncel tarihlilerini alan map fonksiyonu.
// Tarih karsilastirma sekli (AY/GUN/YIL) seklinde
 fetchTry().then(result=> {

    let timeNow = new Date().toISOString().split("T")[0].replace(/-/g, "");
    
    let todayListings = result
    .filter(res => res.CreatedTime.replace(/-/g, "") === timeNow)
    .map(res => ({
      url: res.Url,
      ilanTarihi: res.CreatedTime,
      id: res.id,
      district: res.District,
      location: res.Location
    }));

    // Guncel ilanlarin icindeki ayni ilanlari temizleme.
    const uniqueListings = Array.from(
    new Map(todayListings.map(item => [item.id, item])).values()
  );

    
    // Json file a kaydedilenlerin karsilastirildigi yer.
    // Eger json dosyasi varsa bunu yap.
    // Jsdata gonderilmis ilanlar arrayi ile butun ilanlarin oldugu uniqueListings filtreleniyor
    // Eger son mesaj sonrasi yeni ilan eklenmisse bunlari telegrama yolluyor ve gonderilenler kismina kaydediyor
    if(fs.existsSync("listings.json")){
        let Jsdata = JSON.parse(fs.readFileSync("listings.json",'utf-8'))

        let Ids = new Set(Jsdata.map(j=> j.id))

        let FilteredArray = uniqueListings.filter(f=> !Ids.has(f.id));

        if(FilteredArray.length > 0){
            //Eger yeni ilan eklenmisse
            console.log(FilteredArray);


            // BURADA FilteredArray OGESI TELEGRAMA YOLLANIYOR
            async function sendToTelegram(listings) {
              // Telegram bot tokeni
            const token = ":-";
            // Mesajin gidecegi kisinin telegram chat id'si
            const chatId = "";

           for (const listing of listings) {
             const message = `🏠[İlan:] ${listing.url}\n📅 Tarih: ${listing.ilanTarihi} \n📍Konum: ${listing.district}  `;
    
             await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
               chat_id: chatId,
               text: message
      })
  });
}

             console.log(`✅ Sent ${listings.length} listings to Telegram`);
        }

         //MESAJ YOLLAMA FONKSIYONUNU CALISTIR.
         sendToTelegram(FilteredArray);


         // Gonderilmislere kaydet.
         let MergedNewArray = [...Jsdata,...FilteredArray]
        
            fs.writeFileSync("listings.json",JSON.stringify(MergedNewArray,null,2),"utf-8");
        
        } else{console.log('Bugun yeni ilan yok');}

    }else{
        //Eger json dosyasi hali hazirda yoksa (kod ilk kez calisiyorsa) yeni yarat.

        
        // BURADA uniqueListings OGESI TELEGRAMA YOLLANICAK


        fs.writeFileSync("listings.json", JSON.stringify(uniqueListings, null, 2), "utf-8");
    }

    
    
    

    
    
     
    
})



