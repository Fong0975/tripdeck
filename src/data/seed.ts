import type { Trip, TripContent } from '@/types';
import { saveTrips, saveTripContent, getTrips } from '@/utils/storage';

const TRIPS: Trip[] = [
  {
    id: 'trip-tokyo-2024',
    title: '東京五日遊',
    destination: '日本・東京',
    startDate: '2024-04-01',
    endDate: '2024-04-05',
    description: '春季賞櫻之旅，探索東京各大景點',
    createdAt: '2024-01-15T08:00:00.000Z',
  },
  {
    id: 'trip-kansai-2024',
    title: '京阪神三日遊',
    destination: '日本・關西',
    startDate: '2024-05-10',
    endDate: '2024-05-12',
    description: '感受京都古都風情，品嚐大阪美食',
    createdAt: '2024-02-20T08:00:00.000Z',
  },
];

const CONTENTS: TripContent[] = [
  {
    tripId: 'trip-tokyo-2024',
    days: [
      {
        day: 1,
        date: '2024-04-01',
        attractions: [
          {
            id: 'atk-narita',
            name: '成田國際機場',
            googleMapUrl: 'https://maps.google.com/?q=成田國際機場',
            notes: '第二航廈入境，記得先兌換日幣或購買 IC 卡',
            nearbyAttractions: '成田山新勝寺（約 20 分鐘車程）',
            referenceWebsites: ['https://www.narita-airport.jp/'],
          },
          {
            id: 'atk-asakusa',
            name: '淺草寺',
            googleMapUrl: 'https://maps.google.com/?q=淺草寺',
            notes:
              '東京最古老的寺院，雷門是必拍景點。建議早上前往避開人潮，御朱印集點',
            nearbyAttractions: '仲見世通、淺草花屋敷、隅田公園（賞櫻）',
            referenceWebsites: ['https://www.senso-ji.jp/'],
          },
          {
            id: 'atk-skytree',
            name: '東京晴空塔',
            googleMapUrl: 'https://maps.google.com/?q=東京晴空塔',
            notes:
              '高 634 公尺，天望甲板（350m）票價 ¥2,100，天望迴廊（450m）另需 ¥1,000。建議傍晚前往欣賞夜景',
            nearbyAttractions: '東京晴空塔城、Sumida Aquarium',
            referenceWebsites: ['https://www.tokyo-skytree.jp/'],
          },
        ],
        connections: [
          {
            id: 'conn-narita-asakusa',
            fromAttractionId: 'atk-narita',
            toAttractionId: 'atk-asakusa',
            transportMode: 'transit',
            duration: '約 70 分鐘',
            route:
              '成田機場 → 京成本線特急 → 日暮里 → 東京Metro日比谷線 → 上野 → 銀座線 → 淺草',
            notes: "可考慮購買 N'EX + 地下鐵一日券套票",
          },
          {
            id: 'conn-asakusa-skytree',
            fromAttractionId: 'atk-asakusa',
            toAttractionId: 'atk-skytree',
            transportMode: 'walk',
            duration: '約 15 分鐘',
            route: '沿隅田川步行，路上可欣賞河岸景色',
          },
        ],
      },
      {
        day: 2,
        date: '2024-04-02',
        attractions: [
          {
            id: 'atk-meiji',
            name: '明治神宮',
            googleMapUrl: 'https://maps.google.com/?q=明治神宮',
            notes:
              '供奉明治天皇，周遭森林莊嚴清幽。早晨入場人少，可感受靜謐氛圍',
            nearbyAttractions: '代代木公園（賞花）、原宿',
            referenceWebsites: ['https://www.meijijingu.or.jp/'],
          },
          {
            id: 'atk-takeshita',
            name: '竹下通',
            googleMapUrl: 'https://maps.google.com/?q=竹下通+原宿',
            notes: '日本年輕人潮流聖地，可可軟冰淇淋必吃。店家約 10:00 開門',
            nearbyAttractions: '表參道、貓街（Cat Street）',
          },
          {
            id: 'atk-shibuya',
            name: '澀谷十字路口',
            googleMapUrl: 'https://maps.google.com/?q=澀谷スクランブル交差点',
            notes:
              '全球最著名的行人交叉點，尖峰時段約 3,000 人同時過馬路。可至 MAGNET by SHIBUYA109 屋頂拍攝',
            nearbyAttractions: '澀谷 Sky 展望台（¥2,000）、東急百貨',
            referenceWebsites: ['https://www.shibuya-scramble-square.com/sky/'],
          },
        ],
        connections: [
          {
            id: 'conn-meiji-takeshita',
            fromAttractionId: 'atk-meiji',
            toAttractionId: 'atk-takeshita',
            transportMode: 'walk',
            duration: '約 5 分鐘',
            route: '從明治神宮南參道出口直走即到',
          },
          {
            id: 'conn-takeshita-shibuya',
            fromAttractionId: 'atk-takeshita',
            toAttractionId: 'atk-shibuya',
            transportMode: 'transit',
            duration: '約 10 分鐘',
            route: 'JR 山手線 原宿站 → 澀谷站',
          },
        ],
      },
      {
        day: 3,
        date: '2024-04-03',
        attractions: [
          {
            id: 'atk-shinjuku-gyoen',
            name: '新宿御苑',
            googleMapUrl: 'https://maps.google.com/?q=新宿御苑',
            notes:
              '門票 ¥500，賞櫻名所，園區廣大需 2-3 小時。禁止攜帶酒精飲料入內',
            nearbyAttractions: '大久保（韓國街）、伊勢丹百貨',
            referenceWebsites: ['https://www.env.go.jp/garden/shinjukugyoen/'],
          },
          {
            id: 'atk-kabukicho',
            name: '歌舞伎町一番街',
            googleMapUrl: 'https://maps.google.com/?q=歌舞伎町',
            notes: '新宿最熱鬧的娛樂區，TOHO Cinemas 前哥吉拉雕像必拍',
            nearbyAttractions: '新宿黃金街、思い出横丁（懷舊小吃街）',
          },
          {
            id: 'atk-tocho',
            name: '東京都廳展望台',
            googleMapUrl: 'https://maps.google.com/?q=東京都庁',
            notes:
              '免費入場！南北展望室各在 45 樓，可眺望整個東京，晴天可見富士山。夜間至 22:30',
            nearbyAttractions: '新宿中央公園、京王廣場飯店',
          },
        ],
        connections: [
          {
            id: 'conn-gyoen-kabuki',
            fromAttractionId: 'atk-shinjuku-gyoen',
            toAttractionId: 'atk-kabukicho',
            transportMode: 'walk',
            duration: '約 15 分鐘',
            route: '沿新宿通步行北上',
          },
          {
            id: 'conn-kabuki-tocho',
            fromAttractionId: 'atk-kabukicho',
            toAttractionId: 'atk-tocho',
            transportMode: 'walk',
            duration: '約 10 分鐘',
            route: '穿越新宿西口廣場',
          },
        ],
      },
      {
        day: 4,
        date: '2024-04-04',
        attractions: [
          {
            id: 'atk-ueno',
            name: '上野恩賜公園',
            googleMapUrl: 'https://maps.google.com/?q=上野公園',
            notes:
              '東京最大賞櫻勝地，4 月初約 1,000 棵染井吉野齊放。週末人潮眾多',
            nearbyAttractions: '東京國立博物館、上野動物園、不忍池',
            referenceWebsites: ['https://www.tnm.jp/'],
          },
          {
            id: 'atk-tnm',
            name: '東京國立博物館',
            googleMapUrl: 'https://maps.google.com/?q=東京国立博物館',
            notes: '門票 ¥1,000，收藏日本最豐富的文化財，建議預留 2-3 小時參觀',
            nearbyAttractions: '國立西洋美術館（世界遺產）、國立科學博物館',
            referenceWebsites: ['https://www.tnm.jp/'],
          },
          {
            id: 'atk-akihabara',
            name: '秋葉原電器街',
            googleMapUrl: 'https://maps.google.com/?q=秋葉原',
            notes:
              '動漫聖地，Yodobashi Camera、BIC CAMERA 電器特價。女僕咖啡廳體驗',
            nearbyAttractions: '萬世橋舊鐵道遺跡、神田明神',
          },
        ],
        connections: [
          {
            id: 'conn-ueno-tnm',
            fromAttractionId: 'atk-ueno',
            toAttractionId: 'atk-tnm',
            transportMode: 'walk',
            duration: '約 5 分鐘',
            route: '公園內步行，博物館位於公園北側',
          },
          {
            id: 'conn-tnm-akihabara',
            fromAttractionId: 'atk-tnm',
            toAttractionId: 'atk-akihabara',
            transportMode: 'transit',
            duration: '約 15 分鐘',
            route: 'JR 山手線 上野站 → 秋葉原站',
          },
        ],
      },
      {
        day: 5,
        date: '2024-04-05',
        attractions: [
          {
            id: 'atk-tsukiji',
            name: '築地場外市場',
            googleMapUrl: 'https://maps.google.com/?q=築地場外市場',
            notes:
              '早上 5:30 起開市，建議早到享用最新鮮的海鮮早餐。玉子燒、海膽飯必吃',
            nearbyAttractions: '濱離宮恩賜庭園、勝鬨橋',
            referenceWebsites: ['https://www.tsukiji.or.jp/'],
          },
          {
            id: 'atk-ginza',
            name: '銀座',
            googleMapUrl: 'https://maps.google.com/?q=銀座',
            notes:
              '東京最高級的購物街，GINZA SIX、蔦屋書店必逛。週末 12:00-18:00 中央通封閉為行人徒步區',
            nearbyAttractions: '日比谷公園、東銀座歌舞伎座',
          },
          {
            id: 'atk-narita-dep',
            name: '成田國際機場（出發）',
            googleMapUrl: 'https://maps.google.com/?q=成田國際機場',
            notes:
              '建議提前 3 小時到達，航廈內有多家日本特產免稅店可採購伴手禮',
            referenceWebsites: ['https://www.narita-airport.jp/'],
          },
        ],
        connections: [
          {
            id: 'conn-tsukiji-ginza',
            fromAttractionId: 'atk-tsukiji',
            toAttractionId: 'atk-ginza',
            transportMode: 'walk',
            duration: '約 10 分鐘',
            route: '沿晴海通步行即達',
          },
          {
            id: 'conn-ginza-narita-dep',
            fromAttractionId: 'atk-ginza',
            toAttractionId: 'atk-narita-dep',
            transportMode: 'transit',
            duration: '約 80 分鐘',
            route: '東銀座站 → 都營淺草線 → 日暮里 → 京成特急 → 成田機場',
            notes: '請預留充裕時間，避免誤機',
          },
        ],
      },
    ],
  },
  {
    tripId: 'trip-kansai-2024',
    days: [
      {
        day: 1,
        date: '2024-05-10',
        attractions: [
          {
            id: 'atk-fushimi',
            name: '伏見稻荷大社',
            googleMapUrl: 'https://maps.google.com/?q=伏見稲荷大社',
            notes:
              '全日本約 3 萬座稻荷神社的總本社，千本鳥居為必拍。建議早上 6-7 點前往人少，全程健行約 2-3 小時',
            nearbyAttractions: '伏見夢百衆（日本酒體驗）、月桂冠大倉記念館',
            referenceWebsites: ['https://inari.jp/'],
          },
          {
            id: 'atk-kiyomizu',
            name: '清水寺',
            googleMapUrl: 'https://maps.google.com/?q=清水寺',
            notes:
              '門票 ¥500，清水舞台懸空木造建築為世界遺產，音羽瀑布三道水各司其職（學業、戀愛、長壽）',
            nearbyAttractions: '二年坂、三年坂、祇園',
            referenceWebsites: ['https://www.kiyomizudera.or.jp/'],
          },
          {
            id: 'atk-gion',
            name: '祇園花見小路',
            googleMapUrl: 'https://maps.google.com/?q=祇園花見小路',
            notes:
              '保留江戶時代風情的茶屋街，傍晚有機會遇見舞妓。夜間散步氣氛絕佳',
            nearbyAttractions: '白川（夜間點燈）、建仁寺',
          },
        ],
        connections: [
          {
            id: 'conn-fushimi-kiyomizu',
            fromAttractionId: 'atk-fushimi',
            toAttractionId: 'atk-kiyomizu',
            transportMode: 'transit',
            duration: '約 40 分鐘',
            route: 'JR 稻荷站 → 京都站 → 市巴士 206 號 → 清水道站',
          },
          {
            id: 'conn-kiyomizu-gion',
            fromAttractionId: 'atk-kiyomizu',
            toAttractionId: 'atk-gion',
            transportMode: 'walk',
            duration: '約 15 分鐘',
            route: '沿二年坂、三年坂石板路步行下山',
          },
        ],
      },
      {
        day: 2,
        date: '2024-05-11',
        attractions: [
          {
            id: 'atk-dotonbori',
            name: '道頓堀',
            googleMapUrl: 'https://maps.google.com/?q=道頓堀',
            notes:
              '大阪必訪美食街！章魚燒、大阪燒、串炸等在此一次滿足。格力高跑跑人招牌必拍',
            nearbyAttractions: '心齋橋筋商店街、法善寺橫丁',
          },
          {
            id: 'atk-osaka-castle',
            name: '大阪城',
            googleMapUrl: 'https://maps.google.com/?q=大阪城',
            notes:
              '天守閣入場費 ¥600，8 樓展望台可俯瞰大阪城公園全景。周遭公園春天賞花、夏天音樂祭',
            nearbyAttractions: '大阪城天守閣、西之丸庭園',
            referenceWebsites: ['https://www.osakacastle.net/'],
          },
          {
            id: 'atk-namba',
            name: '難波Parks購物中心',
            googleMapUrl: 'https://maps.google.com/?q=なんばパークス',
            notes:
              '屋頂空中花園免費入場，層層疊疊的綠意花園很適合拍照。B2F 美食街品項豐富',
            nearbyAttractions: '南海難波站、黑門市場（廚師之胃）',
            referenceWebsites: ['https://www.nambaparks.com/'],
          },
        ],
        connections: [
          {
            id: 'conn-dotonbori-osaka-castle',
            fromAttractionId: 'atk-dotonbori',
            toAttractionId: 'atk-osaka-castle',
            transportMode: 'transit',
            duration: '約 20 分鐘',
            route: '大阪Metro千日前線 難波站 → 谷町九丁目站',
          },
          {
            id: 'conn-osaka-castle-namba',
            fromAttractionId: 'atk-osaka-castle',
            toAttractionId: 'atk-namba',
            transportMode: 'transit',
            duration: '約 25 分鐘',
            route:
              '大阪Metro谷町線 天滿橋站 → 谷町九丁目站 → 千日前線 → 難波站',
          },
        ],
      },
      {
        day: 3,
        date: '2024-05-12',
        attractions: [
          {
            id: 'atk-kitano',
            name: '北野異人館街',
            googleMapUrl: 'https://maps.google.com/?q=北野異人館',
            notes:
              '明治時代外國人住宅群，英式、法式、德式洋館散落坡道間。風見雞館（¥500）、萌黃館必參觀',
            nearbyAttractions: '北野天滿神社、三宮中心街',
            referenceWebsites: ['https://www.ijinkan.net/'],
          },
          {
            id: 'atk-kobe-port',
            name: '神戶港（美利堅公園）',
            googleMapUrl: 'https://maps.google.com/?q=メリケンパーク',
            notes:
              '神戶 Port Tower（改裝中）、BE KOBE 地標裝置必拍。港邊夜景浪漫，神戶牛排館林立',
            nearbyAttractions: 'Harborland、南京町（中華街）',
          },
          {
            id: 'atk-kitakyakuchi',
            name: '舊居留地',
            googleMapUrl: 'https://maps.google.com/?q=神戸旧居留地',
            notes:
              '19 世紀外國人居留地，保留大量新古典主義洋館，現為精品商店與咖啡廳。「神戶珈琲」文化起源地',
            nearbyAttractions: '大丸百貨神戶店、元町商店街',
          },
        ],
        connections: [
          {
            id: 'conn-kitano-port',
            fromAttractionId: 'atk-kitano',
            toAttractionId: 'atk-kobe-port',
            transportMode: 'transit',
            duration: '約 20 分鐘',
            route: '北野坂步行至三宮站，搭乘神戶市巴士 → 美利堅公園前',
          },
          {
            id: 'conn-port-kyuryuchi',
            fromAttractionId: 'atk-kobe-port',
            toAttractionId: 'atk-kitakyakuchi',
            transportMode: 'walk',
            duration: '約 10 分鐘',
            route: '沿海岸通步行向東即達',
          },
        ],
      },
    ],
  },
];

/**
 * Seeds localStorage with demo trip data if no trips exist yet.
 */
export function seedDemoDataIfEmpty(): void {
  if (getTrips().length > 0) {
    return;
  }

  saveTrips(TRIPS);
  CONTENTS.forEach(saveTripContent);
}
