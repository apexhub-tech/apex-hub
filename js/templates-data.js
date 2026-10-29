/* Template catalogue — shared by the landing page gallery (main.js) and the agency dashboard (admin.js). */
// Template gallery — one entry per page in templates/
const TEMPLATES = [
  // [type, file, name, features, design style, industry]
  ['saas', 'clinic', 'Clinic booking system', 'Clinics, salons, services', 'Clean medical', 'Health & beauty'],
  ['saas', 'pos', 'POS & inventory', 'Register + order-ahead pickup', 'Café ordering', 'Food & drink'],
  ['saas', 'qrmenu', 'QR menu & table ordering', 'Guest phone + kitchen display', 'Mobile-first menu', 'Food & drink'],
  ['saas', 'kbbq', 'Korean BBQ buffet', 'Buffet tiers, timer & QR rounds', 'Charcoal grill', 'Food & drink'],
  ['saas', 'thai', 'Thai restaurant', 'QR ordering with spice levels', 'Warm Thai', 'Food & drink'],
  ['saas', 'dimsum', 'Dim sum restaurant', 'Tea service & tick-sheet QR', 'Cantonese red', 'Food & drink'],
  ['saas', 'crm', 'CRM & leads', 'Lead capture site + sales pipeline', 'Clean SaaS', 'Business services'],
  ['saas', 'invoices', 'Invoicing & billing', 'Freelancers, agencies, shops', 'Swiss minimal', 'Business services'],
  ['saas', 'academy', 'Online academy', 'Courses, schools, coaches', 'Claymorphism', 'Education'],
  ['saas', 'gym-app', 'Gym management', 'Gyms, studios, clubs', 'Dark neon', 'Fitness'],
  ['saas', 'scheduler', 'Social media scheduler', 'Brands, creators, agencies', 'Glassmorphism', 'Creative & media'],
  ['saas', 'tracking', 'Delivery tracking', 'Couriers, stores, logistics', 'Neubrutalism', 'Logistics'],
  ['web', 'restaurant', 'Mediterranean restaurant', 'Menu tabs & reservations', 'Warm editorial', 'Food & drink'],
  ['web', 'fastfood', 'Fast food restaurant', 'Deals, menu & rewards', 'Fast-food chain', 'Food & drink'],
  ['web', 'coffee', 'Coffee shop chain', 'Drink sizes, rewards & store finder', 'Café chain', 'Food & drink'],
  ['web', 'finedining', 'Fine dining restaurant', 'Tasting menu & seatings', 'Noir luxury', 'Food & drink'],
  ['web', 'hotel', 'Hotel & resort', 'Rooms & availability', 'Luxury editorial', 'Hotels & travel'],
  ['web', 'realestate', 'Real estate listings', 'Search & saved homes', 'Corporate navy', 'Real estate'],
  ['web', 'fitness', 'Fitness club', 'Programs & memberships', 'Bold sports', 'Fitness'],
  ['web', 'spa', 'Spa & salon', 'Treatments & booking', 'Soft UI', 'Health & beauty'],
  ['web', 'lawfirm', 'Law firm', 'Practice areas & consultations', 'Corporate trust', 'Business services'],
  ['web', 'portfolio', 'Photography portfolio', 'Gallery & lightbox', 'Minimal gallery', 'Creative & media'],
  ['store', 'store', 'Fashion online store', 'Cart & filters', 'Monochrome fashion', 'Fashion'],
  ['store', 'sneakers', 'Sneaker drop store', 'Countdown & size picker', 'Brutalist streetwear', 'Fashion'],
  ['store', 'bakery', 'Bakery online ordering', 'Cake builder & pick-up', 'Artisan bakery', 'Food & drink'],
  ['store', 'grocery', 'Grocery delivery', 'Basket & delivery slots', 'Vibrant app-like', 'Food & drink'],
  ['store', 'electronics', 'Electronics store', 'Cart drawer & categories', 'Sleek tech dark', 'Electronics'],
  ['store', 'furniture', 'Furniture store', 'Rooms & colour swatches', 'Scandinavian', 'Home & living'],
  ['store', 'skincare', 'Skincare & beauty store', 'Skin-type routine finder', 'Pastel beauty', 'Health & beauty'],
];
const KIND = { saas: 'SaaS', web: 'Website', store: 'Online store' };
// SaaS templates come as two pages that share live data: [client side label, admin side label]
const SIDES = { clinic: ['Patient site', 'Staff panel'], pos: ['Order-ahead page', 'Staff register'], qrmenu: ['Guest menu', 'Staff panel'], crm: ['Website & proposals', 'Sales CRM'], invoices: ['Client portal', 'Business admin'],
  academy: ['Learner app', 'Instructor studio'], kbbq: ['Guest QR menu', 'Staff panel'], thai: ['Guest QR menu', 'Staff panel'], dimsum: ['Guest QR menu', 'Staff panel'], 'gym-app': ['Member app', 'Staff panel'], scheduler: ['Client portal', 'Agency workspace'], tracking: ['Customer page', 'Merchant panel'] };
