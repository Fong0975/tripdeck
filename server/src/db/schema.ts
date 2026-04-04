/**
 * DDL statements for all tables, ordered by foreign key dependency.
 * Each statement uses CREATE TABLE IF NOT EXISTS so only missing tables are created.
 */
export const tableDefinitions: string[] = [
  `CREATE TABLE IF NOT EXISTS trips (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    destination  VARCHAR(255),
    start_date   DATE         NOT NULL,
    end_date     DATE         NOT NULL,
    description  TEXT,
    created_at   DATETIME     NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS trip_days (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    trip_id  INT NOT NULL,
    day      INT NOT NULL,
    date     DATE NOT NULL,
    UNIQUE KEY uq_trip_day (trip_id, day),
    CONSTRAINT fk_trip_days_trip
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS trip_attractions (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    trip_day_id        INT          NOT NULL,
    name               VARCHAR(255) NOT NULL,
    google_map_url     TEXT,
    notes              TEXT,
    nearby_attractions TEXT,
    sort_order         INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_trip_attractions_day
      FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS trip_attraction_websites (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    trip_attraction_id   INT  NOT NULL,
    url                  TEXT NOT NULL,
    sort_order           INT  NOT NULL DEFAULT 0,
    CONSTRAINT fk_trip_attraction_websites_attraction
      FOREIGN KEY (trip_attraction_id) REFERENCES trip_attractions(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS trip_connections (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    trip_day_id              INT         NOT NULL,
    trip_attraction_id_from  INT         NOT NULL,
    trip_attraction_id_to    INT         NOT NULL,
    transport_mode           VARCHAR(50),
    duration                 VARCHAR(100),
    route                    TEXT,
    notes                    TEXT,
    CONSTRAINT fk_trip_connections_day
      FOREIGN KEY (trip_day_id) REFERENCES trip_days(id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_connections_from
      FOREIGN KEY (trip_attraction_id_from) REFERENCES trip_attractions(id),
    CONSTRAINT fk_trip_connections_to
      FOREIGN KEY (trip_attraction_id_to) REFERENCES trip_attractions(id)
  )`,

  `CREATE TABLE IF NOT EXISTS trip_attraction_images (
    id                   INT          AUTO_INCREMENT PRIMARY KEY,
    trip_attraction_id   INT          NOT NULL,
    filename             VARCHAR(255) NOT NULL,
    title                VARCHAR(255) NOT NULL,
    sort_order           INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_trip_attraction_images_attraction
      FOREIGN KEY (trip_attraction_id) REFERENCES trip_attractions(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS trip_connection_images (
    id                   INT          AUTO_INCREMENT PRIMARY KEY,
    trip_connection_id   INT          NOT NULL,
    filename             VARCHAR(255) NOT NULL,
    title                VARCHAR(255) NOT NULL,
    sort_order           INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_trip_connection_images_connection
      FOREIGN KEY (trip_connection_id) REFERENCES trip_connections(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_template_categories (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_template_items (
    id                              INT AUTO_INCREMENT PRIMARY KEY,
    checklist_template_category_id  INT          NOT NULL,
    name                            VARCHAR(255) NOT NULL,
    sort_order                      INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_template_items_category
      FOREIGN KEY (checklist_template_category_id)
        REFERENCES checklist_template_categories(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_trip_categories (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    trip_id    INT          NOT NULL,
    name       VARCHAR(255) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_checklist_trip_categories_trip
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_trip_items (
    id                          INT AUTO_INCREMENT PRIMARY KEY,
    checklist_trip_category_id  INT          NOT NULL,
    name                        VARCHAR(255) NOT NULL,
    sort_order                  INT          NOT NULL DEFAULT 0,
    CONSTRAINT fk_checklist_trip_items_category
      FOREIGN KEY (checklist_trip_category_id)
        REFERENCES checklist_trip_categories(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_occasions (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    trip_id  INT          NOT NULL,
    name     VARCHAR(255) NOT NULL,
    CONSTRAINT fk_checklist_occasions_trip
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS checklist_checks (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    checklist_occasion_id    INT         NOT NULL,
    checklist_trip_item_id   INT         NOT NULL,
    checked                  TINYINT(1)  NOT NULL DEFAULT 0,
    UNIQUE KEY uq_occasion_item (checklist_occasion_id, checklist_trip_item_id),
    CONSTRAINT fk_checklist_checks_occasion
      FOREIGN KEY (checklist_occasion_id)
        REFERENCES checklist_occasions(id) ON DELETE CASCADE,
    CONSTRAINT fk_checklist_checks_item
      FOREIGN KEY (checklist_trip_item_id)
        REFERENCES checklist_trip_items(id) ON DELETE CASCADE
  )`,
];
