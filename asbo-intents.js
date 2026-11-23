// ASBO's scripted knowledge: the questions she recognises and her answers, in English, Russian and Ukrainian.
// To add or change an answer, edit it here; asbo.js picks the intent and the visitor's language.
// keys: word stems matched anywhere in the question (any language). The longest matching stems win.
// {starter} {business} {advanced} {essential} {care} are filled from services.json, so prices never drift.
// These answers are also ASBO's fallback when the AI is unavailable (wording record: asbo-previews/asbo-knowledge-DRAFT.md, B13).
// go: opens a panel; link: 'calendly' or a URL. RU/UK wording: finalised 2026-11-23 to match the approved English.
window.ASBO_INTENTS = {
  fallback: {
    en: "hmm, that one isn't in olga's notes yet, and i'd rather not make things up. try asking what she has built, how she tests, or what it costs.",
    ru: "хм, этого в заметках ольги пока нет, а выдумывать я не люблю. спросите, что она сделала, как она тестирует или сколько это стоит.",
    uk: "хм, цього в нотатках ольги поки немає, а вигадувати я не люблю. запитайте, що вона створила, як вона тестує або скільки це коштує.",
  },
  intents: [
    {
      id: 'services',
      keys: { en: ['service', 'offer', 'provide', 'what do you do', 'what does she do'], ru: ['услуг', 'предлага', 'чем занима'], uk: ['послуг', 'пропону', 'чим займа'] },
      answer: {
        en: "olga builds websites for small businesses: a one-page website, a business website of up to five pages, or an advanced custom website. she also builds custom web apps, and you can discuss a mobile app project with her; for both, the scope and price are agreed individually. optional monthly care plans are available for websites she built, and those sites can be extended later. an ai assistant can be added as a separately quoted project.",
        ru: "ольга делает сайты для малого бизнеса: одностраничный сайт, бизнес-сайт до пяти страниц или сложный индивидуальный сайт. ещё она создаёт веб-приложения на заказ, а проект мобильного приложения можно обсудить с ней — в обоих случаях объём работ и стоимость согласуются индивидуально. для сайтов, которые она сделала, есть ежемесячные планы обслуживания по желанию, и такие сайты можно потом расширять. ии-ассистента можно добавить как отдельный проект с отдельной оценкой.",
        uk: "ольга створює сайти для малого бізнесу: односторінковий сайт, бізнес-сайт до п'яти сторінок або складний індивідуальний сайт. також вона створює вебзастосунки на замовлення, а проєкт мобільного застосунку можна обговорити з нею — в обох випадках обсяг робіт і вартість погоджуються індивідуально. для сайтів, які вона створила, є щомісячні плани обслуговування за бажанням, і такі сайти можна згодом розширювати. ші-асистента можна додати як окремий проєкт з окремою оцінкою.",
      },
      go: 'services',
    },
    {
      id: 'prices',
      keys: { en: ['price', 'cost', 'how much', 'pricing', 'package', 'budget', '$'], ru: ['цен', 'стоим', 'стоит', 'сколько', 'прайс', 'тариф', 'бюджет'], uk: ['цін', 'вартіст', 'кошту', 'скільки', 'прайс', 'тариф', 'бюджет'] },
      answer: {
        en: "websites start at {starter} for a one-page site, {business} for a business website of up to five pages, and {advanced} for an advanced custom website. these are one-time starting prices, and olga agrees the scope and final price with you before work begins. custom web apps are quoted individually. optional care plans are {essential} or {care} a month.",
        ru: "сайты стоят от {starter} за одностраничный сайт, от {business} за бизнес-сайт до пяти страниц и от {advanced} за сложный индивидуальный сайт. это разовые стартовые цены, а объём работ и итоговую цену ольга согласует с вами до начала работы. веб-приложения на заказ оцениваются индивидуально. планы обслуживания по желанию — {essential} или {care} в месяц.",
        uk: "сайти коштують від {starter} за односторінковий сайт, від {business} за бізнес-сайт до п'яти сторінок і від {advanced} за складний індивідуальний сайт. це разові стартові ціни, а обсяг робіт і остаточну ціну ольга погоджує з вами до початку роботи. вебзастосунки на замовлення оцінюються індивідуально. плани обслуговування за бажанням — {essential} або {care} на місяць.",
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
        en: "olga has built her own studio site and mobile app, enrolla (an admissions crm with a live demo) and a real estate lead assistant prototype, and she's now building a website for tampa bay realtor nataliya fillers.",
        ru: "ольга сделала сайт и мобильное приложение своей студии, enrolla (crm для приёма студентов с живым демо) и прототип ассистента для агентства недвижимости, а сейчас делает сайт для риелтора nataliya fillers из тампа-бэй.",
        uk: "ольга створила сайт і мобільний застосунок своєї студії, enrolla (crm для вступної кампанії з живим демо) і прототип асистента для агенції нерухомості, а зараз створює сайт для рієлторки nataliya fillers з тампа-бей.",
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
        en: "5+ years in qa automation taught olga that ‘it works on my screen’ isn’t good enough. every website package is tested before launch, and you get a short report of what was checked. for web apps and other projects, testing and reporting are agreed as part of the project.",
        ru: "за 5+ лет в автоматизации тестирования ольга поняла, что «у меня работает» — это недостаточно. каждый сайт из её пакетов тестируется перед запуском, и вы получаете короткий отчёт о том, что было проверено. для веб-приложений и других проектов тестирование и отчётность согласуются в рамках проекта.",
        uk: "за понад 5 років в автоматизації тестування ольга зрозуміла, що «у мене працює» — це замало. кожен сайт із її пакетів тестується перед запуском, і ви отримуєте короткий звіт про те, що було перевірено. для вебзастосунків та інших проєктів тестування й звітність погоджуються в межах проєкту.",
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
        en: "olga is the founder of asbo, ai studio by olga. 5+ years of experience in qa automation, now building websites and practical ai tools for small businesses. you talk to her from the first conversation to launch.",
        ru: "ольга — основательница asbo, ai studio by olga. у неё более 5 лет опыта в автоматизации тестирования, а теперь она создаёт сайты и практичные ии-инструменты для малого бизнеса. от первого разговора до запуска вы общаетесь напрямую с ней.",
        uk: "ольга — засновниця asbo, ai studio by olga. вона має понад 5 років досвіду в автоматизації тестування, а тепер створює сайти й практичні ші-інструменти для малого бізнесу. від першої розмови до запуску ви спілкуєтеся безпосередньо з нею.",
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
      // Used instead of answer when the AI is switched on.
      answerAI: {
        en: "i’m asbo, olga’s ai assistant. ask me about her work, services and prices.",
        ru: "я asbo, ии-помощница ольги. спрашивайте меня о её работе, услугах и ценах.",
        uk: "я asbo, ші-помічниця ольги. питайте мене про її роботу, послуги й ціни.",
      },
      answer: {
        en: "i'm asbo, olga's robot helper. i answer from her prepared notes, so ask me about her work, services and prices.",
        ru: "я asbo, робот-помощница ольги. я отвечаю по её подготовленным заметкам: спрашивайте о её работе, услугах и ценах.",
        uk: "я asbo, робот-помічниця ольги. я відповідаю за її підготовленими нотатками: питайте про її роботу, послуги й ціни.",
      },
    },
  ],
};
