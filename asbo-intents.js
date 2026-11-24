// ASBO's scripted knowledge: the questions she recognises and her answers, in English, Russian and Ukrainian.
// To add or change an answer, edit it here; asbo.js picks the intent and the visitor's language.
// keys: word stems matched anywhere in the question (any language). The longest matching stems win.
// {starter} {business} {advanced} {essential} {care} are filled from services.json, so prices never drift.
// These answers are also ASBO's fallback when the AI is unavailable (wording record: asbo-previews/asbo-knowledge-DRAFT.md, B13).
// go: opens a panel; link: 'calendly' or a URL.
// Voice (2026-11-23): a small, friendly robot. Normal sentence case; ASBO and Olga always capitalized. Facts unchanged.
// talk: small talk, things ASBO can't know (weather, time, news) and gentle replies to repeated questions.
// asbo.js answers every part of a message: "Hi, how are you? Who are you?" gets a greeting, an answer and an intro.
window.ASBO_INTENTS = {
  fallback: {
    en: "Hmm, I don't know that one, and I'd rather not guess. I can tell you about Olga's work, her services and prices, or how she tests websites. Or you can ask Olga directly.",
    ru: 'Хм, этого я не знаю, а гадать не хочу. Могу рассказать о работах Ольги, её услугах и ценах или о том, как она тестирует сайты. Или спросите Ольгу напрямую.',
    uk: 'Хм, цього я не знаю, а вгадувати не хочу. Можу розповісти про роботи Ольги, її послуги й ціни або про те, як вона тестує сайти. Або запитайте Ольгу напряму.',
  },
  talk: {
    greet: { en: 'Hi there!', ru: 'Привет!', uk: 'Привіт!' },
    greetAgain: { en: 'Hi again!', ru: 'Ещё раз привет!', uk: 'Ще раз привіт!' },
    how: { en: "I'm doing well, thanks for asking!", ru: 'У меня всё хорошо, спасибо, что спросили!', uk: 'У мене все добре, дякую, що запитали!' },
    howAgain: {
      en: ["Thanks for checking on me again! I'm still doing well.", 'Still doing great, thanks for asking again!'],
      ru: ['Спасибо, что снова спрашиваете! У меня по-прежнему всё хорошо.', 'Всё так же отлично, спасибо, что снова спросили!'],
      uk: ['Дякую, що знову питаєте! У мене й досі все добре.', 'Усе так само чудово, дякую, що знову запитали!'],
    },
    self: { en: "I'm ASBO, Olga's little robot helper.", ru: 'Я ASBO, маленькая робот-помощница Ольги.', uk: 'Я ASBO, маленька робот-помічниця Ольги.' },
    // Used instead of self when the AI is switched on.
    selfAI: { en: "I'm ASBO, Olga's AI assistant.", ru: 'Я ASBO, ИИ-помощница Ольги.', uk: 'Я ASBO, ШІ-помічниця Ольги.' },
    selfAgain: {
      en: ["Still me, ASBO, Olga's little robot helper!", "I'm still ASBO, Olga's robot helper."],
      ru: ['Это всё ещё я, ASBO, робот-помощница Ольги!', 'Я по-прежнему ASBO, робот-помощница Ольги.'],
      uk: ['Це все ще я, ASBO, робот-помічниця Ольги!', 'Я й досі ASBO, робот-помічниця Ольги.'],
    },
    offer: {
      en: 'I can tell you about her work, services and prices, or help you get in touch with her.',
      ru: 'Могу рассказать о работе Ольги, её услугах и ценах или помочь с ней связаться.',
      uk: "Можу розповісти про роботу Ольги, її послуги й ціни або допомогти з нею зв'язатися.",
    },
    ask: { en: 'What can I help you with?', ru: 'Чем могу помочь?', uk: 'Чим можу допомогти?' },
    thanks: { en: ["You're welcome!", 'Happy to help!'], ru: ['Пожалуйста!', 'Рада помочь!'], uk: ['Будь ласка!', 'Рада допомогти!'] },
    anythingElse: { en: 'Anything else I can help with?', ru: 'Чем ещё могу помочь?', uk: 'Чим ще можу допомогти?' },
    bye: { en: 'Bye for now! Come back anytime.', ru: 'Пока! Заходите ещё.', uk: 'Бувайте! Заходьте ще.' },
    weather: {
      en: "I can't check the weather, I'm afraid. I don't have live information like that.",
      ru: 'Погоду я, к сожалению, проверить не могу: у меня нет доступа к актуальной информации.',
      uk: 'Погоду я, на жаль, перевірити не можу: у мене немає доступу до актуальної інформації.',
    },
    weatherAgain: {
      en: ['Still no weather forecast from me, sorry! I only know about Olga and her studio.'],
      ru: ['Прогноза погоды у меня по-прежнему нет, извините! Я знаю только об Ольге и её студии.'],
      uk: ['Прогнозу погоди в мене й досі немає, вибачте! Я знаю лише про Ольгу та її студію.'],
    },
    live: {
      en: "I can't look up live information like the time or the news.",
      ru: 'Актуальную информацию вроде времени или новостей я узнать не могу.',
      uk: 'Актуальну інформацію на кшталт часу чи новин я дізнатися не можу.',
    },
    liveAgain: {
      en: ["Still can't check live information, sorry! I only know about Olga and her studio."],
      ru: ['Актуальную информацию я по-прежнему узнать не могу, извините! Я знаю только об Ольге и её студии.'],
      uk: ['Актуальну інформацію я й досі дізнатися не можу, вибачте! Я знаю лише про Ольгу та її студію.'],
    },
    offerOut: {
      en: "But I'm happy to tell you about Olga's work, services or prices, or you can ask her directly.",
      ru: 'Зато могу рассказать о работе Ольги, её услугах и ценах, или вы можете спросить её напрямую.',
      uk: 'Зате можу розповісти про роботу Ольги, її послуги й ціни, або ви можете запитати її напряму.',
    },
    again: {
      en: ['Happy to go over that again!', "Sure, here's that once more.", 'Of course! Here it is again.'],
      ru: ['С радостью повторю!', 'Конечно, вот ещё раз.', 'Без проблем, повторю.'],
      uk: ['Із радістю повторю!', 'Звісно, ось ще раз.', 'Без проблем, повторю.'],
    },
    fallbackAgain: {
      en: ["I still don't know that one, sorry! I'd rather not guess. Olga can answer it directly, though."],
      ru: ['Этого я по-прежнему не знаю, извините! Гадать не хочу, но Ольга сможет ответить напрямую.'],
      uk: ['Цього я й досі не знаю, вибачте! Вгадувати не хочу, але Ольга зможе відповісти напряму.'],
    },
  },
  intents: [
    {
      id: 'services',
      keys: { en: ['service', 'offer', 'provide', 'what do you do', 'what does she do'], ru: ['услуг', 'предлага', 'чем занима'], uk: ['послуг', 'пропону', 'чим займа'] },
      answer: {
        en: 'Olga builds websites for small businesses: a one-page website, a business website of up to five pages, or an advanced custom website. She also builds custom web apps, and you can talk to her about a mobile app project; for both, the scope and price are agreed individually. Optional monthly care plans are available for websites she built, and those sites can be extended later. An AI assistant can be added as a separately quoted project.',
        ru: 'Ольга делает сайты для малого бизнеса: одностраничный сайт, бизнес-сайт до пяти страниц или сложный индивидуальный сайт. Ещё она создаёт веб-приложения на заказ, а проект мобильного приложения можно обсудить с ней — в обоих случаях объём работ и стоимость согласуются индивидуально. Для сайтов, которые она сделала, есть ежемесячные планы обслуживания по желанию, и такие сайты можно потом расширять. ИИ-ассистента можно добавить как отдельный проект с отдельной оценкой.',
        uk: "Ольга створює сайти для малого бізнесу: односторінковий сайт, бізнес-сайт до п'яти сторінок або складний індивідуальний сайт. Також вона створює вебзастосунки на замовлення, а проєкт мобільного застосунку можна обговорити з нею — в обох випадках обсяг робіт і вартість погоджуються індивідуально. Для сайтів, які вона створила, є щомісячні плани обслуговування за бажанням, і такі сайти можна згодом розширювати. ШІ-асистента можна додати як окремий проєкт з окремою оцінкою.",
      },
      go: 'services',
    },
    {
      id: 'prices',
      keys: { en: ['price', 'cost', 'how much', 'pricing', 'package', 'budget', '$'], ru: ['цен', 'стоим', 'стоит', 'сколько', 'прайс', 'тариф', 'бюджет'], uk: ['цін', 'вартіст', 'кошту', 'скільки', 'прайс', 'тариф', 'бюджет'] },
      answer: {
        en: 'Websites start at {starter} for a one-page site, {business} for a business website of up to five pages, and {advanced} for an advanced custom website. These are one-time starting prices, and Olga agrees the scope and final price with you before work begins. Custom web apps are quoted individually. Optional care plans are {essential} or {care} a month.',
        ru: 'Сайты стоят от {starter} за одностраничный сайт, от {business} за бизнес-сайт до пяти страниц и от {advanced} за сложный индивидуальный сайт. Это разовые стартовые цены, а объём работ и итоговую цену Ольга согласует с вами до начала работы. Веб-приложения на заказ оцениваются индивидуально. Планы обслуживания по желанию — {essential} или {care} в месяц.',
        uk: "Сайти коштують від {starter} за односторінковий сайт, від {business} за бізнес-сайт до п'яти сторінок і від {advanced} за складний індивідуальний сайт. Це разові стартові ціни, а обсяг робіт і остаточну ціну Ольга погоджує з вами до початку роботи. Вебзастосунки на замовлення оцінюються індивідуально. Плани обслуговування за бажанням — {essential} або {care} на місяць.",
      },
      noData: {
        en: "You'll find all the prices in the Services panel.",
        ru: 'Все цены — в разделе Services.',
        uk: 'Усі ціни — у розділі Services.',
      },
      go: 'services',
    },
    {
      id: 'projects',
      keys: { en: ['built', 'build', 'project', 'portfolio', 'made', 'case'], ru: ['проект', 'сделал', 'портфолио', 'кейс'], uk: ['проєкт', 'проект', 'зробил', 'створил', 'портфоліо', 'кейс'] },
      answer: {
        en: "Olga has built her studio's own website and mobile app, Enrolla (an admissions CRM with a live demo) and a real estate lead assistant prototype. Right now she's building a website for Nataliya Fillers, a Tampa Bay realtor.",
        ru: 'Ольга сделала сайт и мобильное приложение своей студии, Enrolla (CRM для приёма студентов с живым демо) и прототип ассистента для агентства недвижимости, а сейчас делает сайт для риелтора Nataliya Fillers из Тампа-Бэй.',
        uk: 'Ольга створила сайт і мобільний застосунок своєї студії, Enrolla (CRM для вступної кампанії з живим демо) і прототип асистента для агенції нерухомості, а зараз створює сайт для рієлторки Nataliya Fillers з Тампа-Бей.',
      },
      go: 'work',
    },
    {
      id: 'enrolla',
      keys: { en: ['enrolla', 'crm', 'college', 'admission'], ru: ['enrolla', 'колледж', 'приём студ', 'прием студ'], uk: ['enrolla', 'коледж', 'вступ'] },
      answer: {
        en: "Enrolla puts every college enquiry in one queue and gives it to one counsellor within seconds. First replies are drafted from the programme table, and reminders stop the moment the student replies. It's checked with automated end-to-end tests.",
        ru: 'Enrolla собирает все заявки колледжа в одну очередь и за секунды передаёт каждую одному консультанту. Первые ответы составляются из таблицы программ, а напоминания останавливаются, как только студент ответил. Всё проверено автоматическими сквозными тестами.',
        uk: 'Enrolla збирає всі заявки коледжу в одну чергу й за секунди передає кожну одному консультантові. Перші відповіді складаються з таблиці програм, а нагадування зупиняються, щойно студент відповів. Усе перевірено автоматичними наскрізними тестами.',
      },
      link: 'https://enrolla-five.vercel.app',
      linkLabel: 'open_live_demo ↗',
    },
    {
      id: 'nataliya',
      keys: { en: ['nataliya', 'natalia', 'realtor', 'tampa'], ru: ['наталь', 'риелтор', 'тампа'], uk: ['наталі', 'рієлтор', 'тампа'] },
      answer: {
        en: "Nataliya Fillers is Olga's first client website. She's a Tampa Bay realtor known in the Russian-speaking community for always being there for her clients. The site is in progress now.",
        ru: 'Nataliya Fillers — первый клиентский сайт Ольги: риелтор из Тампа-Бэй, которую в русскоязычном сообществе знают как человека, всегда готового помочь клиентам. Сайт сейчас в работе.',
        uk: 'Nataliya Fillers — перший клієнтський сайт Ольги: рієлторка з Тампа-Бей, яку в російськомовній спільноті знають як людину, що завжди поруч зі своїми клієнтами. Сайт зараз у роботі.',
      },
      go: 'work',
    },
    {
      id: 'studio',
      keys: { en: [' app', 'mobile', 'studio', 'asbo', 'your website', 'this website', 'this site'], ru: ['приложени'], uk: ['застосун'] },
      answer: {
        en: "ASBO is short for AI Studio by Olga. The studio has a website in three languages and an iOS and Android app, and every lead lands in a database, Olga's inbox and her phone.",
        ru: 'ASBO — это AI Studio by Olga. У студии сайт на трёх языках и приложение для iOS и Android: каждая заявка попадает в базу, на почту и на телефон Ольги.',
        uk: 'ASBO — це AI Studio by Olga. У студії сайт трьома мовами й застосунок для iOS та Android: кожна заявка потрапляє в базу, на пошту й на телефон Ольги.',
      },
    },
    {
      id: 'testing',
      keys: { en: ['test', 'qa', 'quality', 'launch', 'break', 'bug'], ru: ['тест', 'качеств', 'баг', 'ошибк'], uk: ['тест', 'якіст', 'баг', 'помилк'] },
      answer: {
        en: '5+ years in QA automation taught Olga that “it works on my screen” isn’t good enough. Every website package is tested before launch, and you get a short report of what was checked. For web apps and other projects, testing and reporting are agreed as part of the project.',
        ru: 'За 5+ лет в автоматизации тестирования Ольга поняла, что «у меня работает» — это недостаточно. Каждый сайт из её пакетов тестируется перед запуском, и вы получаете короткий отчёт о том, что было проверено. Для веб-приложений и других проектов тестирование и отчётность согласуются в рамках проекта.',
        uk: 'За понад 5 років в автоматизації тестування Ольга зрозуміла, що «у мене працює» — це замало. Кожен сайт із її пакетів тестується перед запуском, і ви отримуєте короткий звіт про те, що було перевірено. Для вебзастосунків та інших проєктів тестування й звітність погоджуються в межах проєкту.',
      },
    },
    {
      id: 'other-developer',
      keys: { en: ['someone else', 'another developer', 'other developer', 'my current website', 'my existing website', 'take over', 'fix my website'], ru: ['чужой', 'другой разработ', 'существующ', 'мой текущий', 'мой сайт'], uk: ['чужий', 'інший розроб', 'існуюч', 'наявн', 'мій сайт'] },
      answer: {
        en: 'Olga only maintains, changes or redesigns websites she built herself. If your current site was made by another developer or agency, she can build you a completely new one from scratch.',
        ru: 'Ольга обслуживает, дорабатывает и переделывает только сайты, которые сделала сама. Если ваш текущий сайт делал другой разработчик или агентство, она может сделать вам полностью новый сайт с нуля.',
        uk: 'Ольга обслуговує, доопрацьовує й переробляє лише сайти, які створила сама. Якщо ваш поточний сайт робив інший розробник чи агенція, вона може створити вам повністю новий сайт з нуля.',
      },
      go: 'services',
    },
    {
      id: 'help',
      keys: { en: ['help', 'business', 'salon', 'gym', 'fitness', 'real estate', 'beauty', 'hire'], ru: ['помо', 'бизнес', 'салон', 'фитнес', 'недвижим'], uk: ['допомо', 'бізнес', 'салон', 'фітнес', 'нерухом'] },
      answer: {
        en: 'Probably! Olga builds websites and AI assistants for salons, studios, real estate offices and local services, and she tests everything before launch. The first conversation is free.',
        ru: 'Скорее всего, да! Ольга делает сайты и ИИ-ассистентов для салонов, студий, агентств недвижимости и местного бизнеса и всё тестирует до запуска. Первая консультация бесплатна.',
        uk: 'Найімовірніше, так! Ольга створює сайти й ШІ-асистентів для салонів, студій, агенцій нерухомості та місцевого бізнесу і все тестує до запуску. Перша консультація безкоштовна.',
      },
      link: 'calendly',
    },
    {
      id: 'languages',
      keys: { en: ['language', 'russian', 'ukrainian', 'english', 'speak'], ru: ['язык', 'русск', 'украин', 'английск', 'говори'], uk: ['мов', 'російськ', 'українськ', 'англійськ', 'розмовля'] },
      answer: {
        en: 'Olga speaks English, Russian and Ukrainian, and so do I.',
        ru: 'Ольга говорит на английском, русском и украинском, и я тоже отвечаю на этих трёх языках.',
        uk: 'Ольга розмовляє англійською, російською та українською, і я теж відповідаю цими трьома мовами.',
      },
    },
    {
      id: 'about',
      keys: { en: ['who', 'olga', 'about', 'background', 'experience', 'founder'], ru: ['кто', 'ольг', 'опыт', 'основател'], uk: ['хто', 'ольг', 'досвід', 'засновни'] },
      answer: {
        en: 'Olga is the founder of ASBO, AI Studio by Olga. She has 5+ years of experience in QA automation and now builds websites and practical AI tools for small businesses. You talk to her directly, from the first conversation to launch.',
        ru: 'Ольга — основательница ASBO, AI Studio by Olga. У неё более 5 лет опыта в автоматизации тестирования, а теперь она создаёт сайты и практичные ИИ-инструменты для малого бизнеса. От первого разговора до запуска вы общаетесь напрямую с ней.',
        uk: 'Ольга — засновниця ASBO, AI Studio by Olga. Вона має понад 5 років досвіду в автоматизації тестування, а тепер створює сайти й практичні ШІ-інструменти для малого бізнесу. Від першої розмови до запуску ви спілкуєтеся безпосередньо з нею.',
      },
      go: 'about',
    },
    {
      id: 'contact',
      keys: { en: ['contact', 'email', 'book', 'call', 'meet', 'reach', 'talk', 'consultation'], ru: ['связат', 'контакт', 'почт', 'написат', 'позвон', 'консультац', 'встреч'], uk: ["зв'яз", 'контакт', 'пошт', 'написат', 'зателефон', 'консультац', 'зустріч'] },
      answer: {
        en: 'The easiest way is a free consultation on Calendly, or you can email asboagent@gmail.com.',
        ru: 'Проще всего записаться на бесплатную консультацию в Calendly или написать на asboagent@gmail.com.',
        uk: 'Найпростіше записатися на безкоштовну консультацію в Calendly або написати на asboagent@gmail.com.',
      },
      link: 'calendly',
    },
    {
      // "Who are you?" is recognised as small talk in asbo.js (talk.self + talk.offer); kept here for the reply
      // checker and as the complete self-introduction.
      id: 'self',
      keys: { en: [], ru: [], uk: [] },
      answerAI: {
        en: "I'm ASBO, Olga's AI assistant. Ask me about her work, services and prices.",
        ru: 'Я ASBO, ИИ-помощница Ольги. Спрашивайте меня о её работе, услугах и ценах.',
        uk: 'Я ASBO, ШІ-помічниця Ольги. Питайте мене про її роботу, послуги й ціни.',
      },
      answer: {
        en: "I'm ASBO, Olga's little robot helper. I can tell you about her work, services and prices, or help you get in touch with her.",
        ru: 'Я ASBO, маленькая робот-помощница Ольги. Могу рассказать о работе Ольги, её услугах и ценах или помочь с ней связаться.',
        uk: "Я ASBO, маленька робот-помічниця Ольги. Можу розповісти про роботу Ольги, її послуги й ціни або допомогти з нею зв'язатися.",
      },
    },
  ],
};
