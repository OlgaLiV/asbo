// ASBO's scripted knowledge: the questions she recognises and her answers, in English, Russian and Ukrainian.
// To add or change an answer, edit it here; asbo.js picks the intent and the visitor's language.
// keys: word stems matched anywhere in the question (any language). The longest matching stems win.
// {starter} {business} {advanced} {essential} {care} are filled from services.json, so prices never drift.
// go: opens a panel; link: 'calendly' or a URL. RU/UK wording: translated by Claude, pending Olga's review.
window.ASBO_INTENTS = {
  fallback: {
    en: "i don't know that one yet. i only answer from olga's notes. try asking what she has built, how she tests, or what it costs.",
    ru: 'этого я пока не знаю: я отвечаю только по заметкам ольги. спросите, что она сделала, как она тестирует или сколько это стоит.',
    uk: 'цього я поки не знаю: я відповідаю лише за нотатками ольги. запитайте, що вона створила, як вона тестує або скільки це коштує.',
  },
  intents: [
    {
      id: 'services',
      keys: { en: ['service', 'offer', 'provide', 'what do you do', 'what does she do'], ru: ['услуг', 'предлага', 'чем занима'], uk: ['послуг', 'пропону', 'чим займа'] },
      answer: {
        en: 'olga builds websites for small businesses: a one-page starter, a business website of up to 5 pages, or an advanced custom website. optional monthly care keeps a site checked and updated, and sites she built can be extended later. ai assistants are a separate service.',
        ru: 'ольга делает сайты для малого бизнеса: одностраничный starter, сайт business до 5 страниц или сложный сайт advanced. по желанию есть ежемесячное обслуживание, а сайты, которые она сделала, можно потом расширять. ии-ассистенты — отдельная услуга.',
        uk: 'ольга створює сайти для малого бізнесу: односторінковий starter, сайт business до 5 сторінок або складний сайт advanced. за бажанням є щомісячне обслуговування, а сайти, які вона створила, можна згодом розширювати. ші-асистенти — окрема послуга.',
      },
      go: 'services',
    },
    {
      id: 'prices',
      keys: { en: ['price', 'cost', 'how much', 'pricing', 'package', 'budget', '$'], ru: ['цен', 'стоим', 'стоит', 'сколько', 'прайс', 'тариф', 'бюджет'], uk: ['цін', 'вартіст', 'кошту', 'скільки', 'прайс', 'тариф', 'бюджет'] },
      answer: {
        en: 'website packages, one-time: starter {starter}, business {business} (the base for up to 5 pages; extra pages or features are quoted), advanced from {advanced}. optional care: {essential} or {care} a month. the final price and scope are agreed in writing before work starts.',
        ru: 'сайты, разовая оплата: starter {starter}, business {business} (база до 5 страниц; дополнительные страницы и функции оцениваются отдельно), advanced от {advanced}. обслуживание по желанию: {essential} или {care} в месяц. итоговая цена и объём фиксируются письменно до начала работы.',
        uk: 'сайти, разова оплата: starter {starter}, business {business} (база до 5 сторінок; додаткові сторінки й функції оцінюються окремо), advanced від {advanced}. обслуговування за бажанням: {essential} або {care} на місяць. остаточна ціна й обсяг фіксуються письмово до початку роботи.',
      },
      noData: {
        en: 'all prices are in the services panel.',
        ru: 'все цены — в разделе services.',
        uk: 'усі ціни — у розділі services.',
      },
      go: 'services',
    },
    {
      id: 'projects',
      keys: { en: ['built', 'build', 'project', 'portfolio', 'made', 'case'], ru: ['проект', 'сделал', 'портфолио', 'кейс'], uk: ['проєкт', 'проект', 'зробил', 'створил', 'портфоліо', 'кейс'] },
      answer: {
        en: 'olga has built her own studio site and mobile app, enrolla (an admissions crm with a live demo), a website for tampa bay realtor nataliya fillers, and a real estate lead assistant prototype.',
        ru: 'ольга сделала сайт и мобильное приложение своей студии, enrolla (crm для приёма студентов с живым демо), сайт для риелтора nataliya fillers из тампа-бэй и прототип ассистента для агентства недвижимости.',
        uk: 'ольга створила сайт і мобільний застосунок своєї студії, enrolla (crm для вступної кампанії з живим демо), сайт для рієлторки nataliya fillers з тампа-бей і прототип асистента для агенції нерухомості.',
      },
      go: 'work',
    },
    {
      id: 'enrolla',
      keys: { en: ['enrolla', 'crm', 'college', 'admission'], ru: ['enrolla', 'колледж', 'приём студ', 'прием студ'], uk: ['enrolla', 'коледж', 'вступ'] },
      answer: {
        en: 'enrolla puts every college enquiry in one queue and gives it to one counsellor within seconds. first replies are drafted from the programme table, and reminders stop the moment the student replies. it is checked with automated end-to-end tests.',
        ru: 'enrolla собирает все заявки колледжа в одну очередь и за секунды передаёт каждую одному консультанту. первые ответы составляются из таблицы программ, а напоминания останавливаются, как только студент ответил. всё проверено автоматическими сквозными тестами.',
        uk: 'enrolla збирає всі заявки коледжу в одну чергу й за секунди передає кожну одному консультантові. перші відповіді складаються з таблиці програм, а нагадування зупиняються, щойно студент відповів. усе перевірено автоматичними наскрізними тестами.',
      },
      link: 'https://enrolla-five.vercel.app',
      linkLabel: 'open_live_demo ↗',
    },
    {
      id: 'nataliya',
      keys: { en: ['nataliya', 'natalia', 'realtor', 'tampa'], ru: ['наталь', 'риелтор', 'тампа'], uk: ['наталі', 'рієлтор', 'тампа'] },
      answer: {
        en: "nataliya fillers is olga's first client website: a tampa bay realtor known in the russian-speaking community for being there for her clients. it's in progress now.",
        ru: 'nataliya fillers — первый клиентский сайт ольги: риелтор из тампа-бэй, которую в русскоязычном сообществе знают как человека, всегда готового помочь клиентам. сайт сейчас в работе.',
        uk: 'nataliya fillers — перший клієнтський сайт ольги: рієлторка з тампа-бей, яку в російськомовній спільноті знають як людину, що завжди поруч зі своїми клієнтами. сайт зараз у роботі.',
      },
      go: 'work',
    },
    {
      id: 'studio',
      keys: { en: ['app', 'mobile', 'studio', 'asbo', 'website'], ru: ['приложени'], uk: ['застосун'] },
      answer: {
        en: 'asbo is ai studio by olga. the studio has a three-language website and an ios and android app. every lead lands in a database, her inbox and her phone.',
        ru: 'asbo — это ai studio by olga. у студии сайт на трёх языках и приложение для ios и android: каждая заявка попадает в базу, на почту и на телефон ольги.',
        uk: 'asbo — це ai studio by olga. у студії сайт трьома мовами й застосунок для ios та android: кожна заявка потрапляє в базу, на пошту й на телефон ольги.',
      },
    },
    {
      id: 'testing',
      keys: { en: ['test', 'qa', 'quality', 'launch', 'break', 'bug'], ru: ['тест', 'качеств', 'баг', 'ошибк'], uk: ['тест', 'якіст', 'баг', 'помилк'] },
      answer: {
        en: "nine years as a qa automation engineer taught olga that 'it works on my screen' isn't good enough. every project is checked against your requirements, your tools and odd questions before a single client sees it, and you get the test report.",
        ru: 'девять лет в автоматизации тестирования научили ольгу, что «у меня работает» — это недостаточно. каждый проект проверяется по вашим требованиям, на ваших инструментах и необычных вопросах до того, как его увидит клиент, и вы получаете отчёт о тестировании.',
        uk: "дев'ять років в автоматизації тестування навчили ольгу, що «у мене працює» — це замало. кожен проєкт перевіряється за вашими вимогами, на ваших інструментах і незвичних запитаннях, перш ніж його побачить клієнт, і ви отримуєте звіт про тестування.",
      },
    },
    {
      id: 'other-developer',
      keys: { en: ['someone else', 'another developer', 'other developer', 'my current website', 'my existing website', 'take over', 'fix my website'], ru: ['чужой', 'другой разработ', 'существующ', 'мой текущий', 'мой сайт'], uk: ['чужий', 'інший розроб', 'існуюч', 'наявн', 'мій сайт'] },
      answer: {
        en: 'olga only maintains, changes or redesigns websites she built herself. if your current site was made by another developer or agency, she can build you a completely new one from scratch.',
        ru: 'ольга обслуживает, дорабатывает и переделывает только сайты, которые сделала сама. если ваш текущий сайт делал другой разработчик или агентство, она может сделать вам полностью новый сайт с нуля.',
        uk: 'ольга обслуговує, доопрацьовує й переробляє лише сайти, які створила сама. якщо ваш поточний сайт робив інший розробник чи агенція, вона може створити вам повністю новий сайт з нуля.',
      },
      go: 'services',
    },
    {
      id: 'help',
      keys: { en: ['help', 'business', 'salon', 'gym', 'fitness', 'real estate', 'beauty', 'hire'], ru: ['помо', 'бизнес', 'салон', 'фитнес', 'недвижим'], uk: ['допомо', 'бізнес', 'салон', 'фітнес', 'нерухом'] },
      answer: {
        en: 'probably. olga builds websites and ai assistants for salons, studios, real estate offices and local services, and tests everything before launch. the first conversation is free.',
        ru: 'скорее всего, да. ольга делает сайты и ии-ассистентов для салонов, студий, агентств недвижимости и местного бизнеса и всё тестирует до запуска. первая консультация бесплатна.',
        uk: 'найімовірніше, так. ольга створює сайти й ші-асистентів для салонів, студій, агенцій нерухомості та місцевого бізнесу і все тестує до запуску. перша консультація безкоштовна.',
      },
      link: 'calendly',
    },
    {
      id: 'languages',
      keys: { en: ['language', 'russian', 'ukrainian', 'english', 'speak'], ru: ['язык', 'русск', 'украин', 'английск', 'говори'], uk: ['мов', 'російськ', 'українськ', 'англійськ', 'розмовля'] },
      answer: {
        en: 'olga speaks english, russian and ukrainian, and so do i.',
        ru: 'ольга говорит на английском, русском и украинском, и я тоже отвечаю на этих трёх языках.',
        uk: 'ольга розмовляє англійською, російською та українською, і я теж відповідаю цими трьома мовами.',
      },
    },
    {
      id: 'about',
      keys: { en: ['who', 'olga', 'about', 'background', 'experience', 'founder'], ru: ['кто', 'ольг', 'опыт', 'основател'], uk: ['хто', 'ольг', 'досвід', 'засновни'] },
      answer: {
        en: 'olga is the founder of asbo, ai studio by olga. nine years of qa automation, now building websites and practical ai tools for small businesses. you talk to her from the first conversation to launch.',
        ru: 'ольга — основательница asbo, ai studio by olga. девять лет в автоматизации тестирования, теперь она создаёт сайты и практичные ии-инструменты для малого бизнеса. от первого разговора до запуска вы общаетесь напрямую с ней.',
        uk: "ольга — засновниця asbo, ai studio by olga. дев'ять років в автоматизації тестування, тепер вона створює сайти й практичні ші-інструменти для малого бізнесу. від першої розмови до запуску ви спілкуєтеся безпосередньо з нею.",
      },
      go: 'about',
    },
    {
      id: 'contact',
      keys: { en: ['contact', 'email', 'book', 'call', 'meet', 'reach', 'talk', 'consultation'], ru: ['связат', 'контакт', 'почт', 'написат', 'позвон', 'консультац', 'встреч'], uk: ["зв'яз", 'контакт', 'пошт', 'написат', 'зателефон', 'консультац', 'зустріч'] },
      answer: {
        en: 'the easiest way is a free consultation on calendly, or email asboagent@gmail.com.',
        ru: 'проще всего записаться на бесплатную консультацию в calendly или написать на asboagent@gmail.com.',
        uk: 'найпростіше записатися на безкоштовну консультацію в calendly або написати на asboagent@gmail.com.',
      },
      link: 'calendly',
    },
    {
      id: 'self',
      keys: { en: ['robot', 'who are you', 'your name', 'are you'], ru: ['робот', 'ты кто', 'кто ты', 'тебя зовут'], uk: ['робот', 'хто ти', 'ти хто', 'тебе звати'] },
      answer: {
        en: "i'm asbo, short for ai studio by olga. i'm a simple scripted assistant: i only answer from olga's notes, and i don't send anything anywhere.",
        ru: 'я asbo — сокращение от ai studio by olga. я простой ассистент со сценариями: отвечаю только по заметкам ольги и никуда ничего не отправляю.',
        uk: 'я asbo — скорочення від ai studio by olga. я простий асистент зі сценаріями: відповідаю лише за нотатками ольги й нікуди нічого не надсилаю.',
      },
    },
  ],
};
