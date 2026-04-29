-- MySQL initialization script for RCA platform.
-- This script is idempotent and mirrors backend/app/models.py.

CREATE DATABASE IF NOT EXISTS rca_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rca_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS datasets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(512) NOT NULL,
  filename VARCHAR(512) NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  file_format VARCHAR(32) NOT NULL,
  `rows` INT NOT NULL,
  `cols` INT NOT NULL,
  columns_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_datasets_user_id (user_id),
  CONSTRAINT fk_datasets_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT NOT NULL,
  target VARCHAR(512) NOT NULL,
  value_column VARCHAR(512) NULL,
  task_type VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  metrics_json LONGTEXT NULL,
  insights_json LONGTEXT NULL,
  recommendations_json LONGTEXT NULL,
  shap_json LONGTEXT NULL,
  report_json LONGTEXT NULL,
  artifacts_path VARCHAR(1024) NULL,
  error LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  INDEX ix_analyses_dataset_id (dataset_id),
  CONSTRAINT fk_analyses_dataset_id
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;
