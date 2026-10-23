-- Admin-managed offer taxonomy. Offers keep storing the category `code`, so existing
-- offers and discovery projections remain valid without a data migration.
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(500),
    icon VARCHAR(16),
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX idx_categories_parent_order ON categories (parent_id, sort_order);

-- Top-level categories. The first nine codes match the earlier fixed enum.
INSERT INTO categories (id, code, slug, name, icon, sort_order, description) VALUES
 (gen_random_uuid(), 'FOOD_AND_DRINK', 'food-cafes', 'Food & Cafés', '🍔', 10, 'Cafés, restaurants, bakeries and street food.'),
 (gen_random_uuid(), 'FASHION', 'fashion', 'Fashion', '👗', 20, 'Clothing, bags and fashion accessories.'),
 (gen_random_uuid(), 'ELECTRONICS', 'electronics', 'Electronics', '💻', 30, 'Phones, computers, appliances and gadgets.'),
 (gen_random_uuid(), 'HEALTH_AND_BEAUTY', 'beauty-wellness', 'Beauty & Wellness', '💄', 40, 'Cosmetics, personal care and wellness.'),
 (gen_random_uuid(), 'SHOES_ACCESSORIES', 'shoes-accessories', 'Shoes & Accessories', '👟', 50, 'Footwear, belts, wallets and accessories.'),
 (gen_random_uuid(), 'HOME_AND_GARDEN', 'home-living', 'Home & Living', '🛋️', 60, 'Furniture, décor, kitchen and garden.'),
 (gen_random_uuid(), 'GROCERY', 'grocery', 'Grocery & Supermarkets', '🛒', 70, 'Groceries and everyday essentials.'),
 (gen_random_uuid(), 'JEWELLERY_WATCHES', 'jewellery-watches', 'Jewellery & Watches', '💍', 80, NULL),
 (gen_random_uuid(), 'FITNESS_SPORTS', 'fitness-sports', 'Fitness & Sports', '🏋️', 90, NULL),
 (gen_random_uuid(), 'SALONS_SPAS', 'salons-spas', 'Salons & Spas', '💇', 100, NULL),
 (gen_random_uuid(), 'EDUCATION_CLASSES', 'education-classes', 'Education & Classes', '📚', 110, NULL),
 (gen_random_uuid(), 'AUTOMOBILE_SERVICES', 'automobile-services', 'Automobile Services', '🚗', 120, NULL),
 (gen_random_uuid(), 'BOOKS_STATIONERY', 'books-stationery', 'Books & Stationery', '✏️', 130, NULL),
 (gen_random_uuid(), 'ENTERTAINMENT', 'entertainment-events', 'Entertainment & Events', '🎟️', 140, NULL),
 (gen_random_uuid(), 'TRAVEL_EXPERIENCES', 'travel-experiences', 'Travel & Experiences', '✈️', 150, NULL),
 (gen_random_uuid(), 'KIDS_BABY', 'kids-baby', 'Kids & Baby', '🧸', 160, NULL),
 (gen_random_uuid(), 'SERVICES', 'home-services', 'Home Services', '🧰', 170, 'Repairs, cleaning and other services at home.'),
 (gen_random_uuid(), 'OTHER', 'other', 'Other Local Businesses', '🏪', 1000, NULL);

-- Initial subcategories.
INSERT INTO categories (id, code, slug, name, icon, parent_id, sort_order)
SELECT gen_random_uuid(), sub.code, sub.slug, sub.name, sub.icon, parent.id, sub.sort_order
FROM (VALUES
    ('CAFES', 'cafes', 'Cafés', '☕', 'FOOD_AND_DRINK', 10),
    ('RESTAURANTS', 'restaurants', 'Restaurants', '🍽️', 'FOOD_AND_DRINK', 20),
    ('BAKERIES', 'bakeries', 'Bakeries', '🥐', 'FOOD_AND_DRINK', 30),
    ('STREET_FOOD', 'street-food', 'Street Food', '🌮', 'FOOD_AND_DRINK', 40),
    ('CLOTHING', 'clothing', 'Clothing', '👕', 'FASHION', 10),
    ('BAGS', 'bags', 'Bags', '👜', 'FASHION', 20)
) AS sub(code, slug, name, icon, parent_code, sort_order)
JOIN categories parent ON parent.code = sub.parent_code;
