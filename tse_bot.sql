-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 21, 2025 at 11:01 AM
-- Server version: 8.0.42-0ubuntu0.24.04.1
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tse_bot`
--

-- --------------------------------------------------------

--
-- Table structure for table `contributions`
--

CREATE TABLE `contributions` (
  `id` int NOT NULL,
  `target_id` int NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `amount` int NOT NULL,
  `location` varchar(255) NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `contributions`
--

INSERT INTO `contributions` (`id`, `target_id`, `user_id`, `username`, `amount`, `location`, `timestamp`) VALUES
(1, 2, '615971782293192714', 'xlizer', 44, 'daymar', '2025-02-28 07:20:54'),
(2, 2, '615971782293192714', 'xlizer', 130, 'yela', '2025-02-28 07:21:56'),
(3, 3, '615971782293192714', 'xlizer', 447, 'yela', '2025-02-28 21:07:01'),
(9, 12, '127065710944976896', 'kayatoshi', 230, 'Seraphim', '2025-03-09 07:36:43'),
(10, 13, '127065710944976896', 'kayatoshi', 200, 'Seraphim', '2025-03-09 07:37:00'),
(11, 11, '127065710944976896', 'kayatoshi', 53, 'Ruin Station', '2025-03-13 17:53:19'),
(12, 12, '253598351193407489', 'theshooter36', 90, 'Area18', '2025-03-15 00:06:19'),
(13, 13, '253598351193407489', 'theshooter36', 12, 'Area18', '2025-03-15 00:06:46'),
(14, 13, '253598351193407489', 'theshooter36', 32, 'Area18', '2025-03-15 00:07:07'),
(15, 13, '791060221090463744', 'flying_monkeys', 10, 'Baijini', '2025-03-15 20:05:55'),
(16, 12, '791060221090463744', 'flying_monkeys', 10, 'Baijini', '2025-03-15 20:06:34'),
(29, 15, '253598351193407489', 'theshooter36', 50, 'Area18', '2025-04-13 15:15:09'),
(30, 28, '253598351193407489', 'theshooter36', 2, 'Checkmate', '2025-04-13 15:15:42'),
(31, 23, '253598351193407489', 'theshooter36', 3, 'Seraphim Station', '2025-04-13 15:16:26'),
(32, 27, '791397111777329222', 'jinxlunxcy', 20, 'Outposts.', '2025-04-13 15:56:55'),
(36, 29, '176084099528654859', '.gorkem', 8, 'Area 18', '2025-04-14 14:25:44'),
(45, 29, '229340352106987522', 'revakara', 13, 'Seraphim Station', '2025-04-17 22:07:23'),
(46, 7, '176084099528654859', '.gorkem', 88, 'Orbituary', '2025-04-23 17:51:28');

-- --------------------------------------------------------

--
-- Table structure for table `dashboards`
--

CREATE TABLE `dashboards` (
  `id` int NOT NULL,
  `message_id` varchar(100) NOT NULL,
  `channel_id` varchar(100) NOT NULL,
  `guild_id` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `dashboards`
--

INSERT INTO `dashboards` (`id`, `message_id`, `channel_id`, `guild_id`, `created_at`) VALUES
(1, '1344940339030392832', '1096701754806128693', '1096701753329721425', '2025-02-28 07:52:45'),
(2, '1345141180115193980', '1096701754806128693', '1096701753329721425', '2025-02-28 21:10:48'),
(3, '1345152931782983793', '1096701754806128693', '1096701753329721425', '2025-02-28 21:57:30'),
(4, '1345350511032799285', '1345348097844318301', '1260629720270245908', '2025-03-01 11:02:37'),
(5, '1345355533905035314', '1096701754806128693', '1096701753329721425', '2025-03-01 11:22:34'),
(6, '1364229759332253776', '1096701754806128693', '1096701753329721425', '2025-04-22 13:22:00');

-- --------------------------------------------------------

--
-- Table structure for table `progress`
--

CREATE TABLE `progress` (
  `target_id` int NOT NULL,
  `current_amount` int NOT NULL DEFAULT '0',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `progress`
--

INSERT INTO `progress` (`target_id`, `current_amount`, `last_updated`) VALUES
(32, 0, '2025-05-04 08:39:03'),
(15, 50, '2025-04-13 15:15:09'),
(7, 88, '2025-04-23 17:51:28'),
(8, 0, '2025-04-03 00:47:41'),
(19, 0, '2025-05-04 08:35:43'),
(18, 0, '2025-05-04 08:35:33'),
(31, 0, '2025-05-04 08:38:44'),
(20, 0, '2025-05-04 08:35:57'),
(21, 0, '2025-04-03 00:46:46'),
(22, 0, '2025-05-04 08:36:32'),
(23, 3, '2025-04-13 15:16:26'),
(24, 0, '2025-04-03 10:55:15'),
(25, 0, '2025-04-03 10:56:45'),
(26, 0, '2025-04-06 12:42:41'),
(27, 20, '2025-04-13 15:56:55'),
(28, 2, '2025-04-13 15:15:42'),
(29, 21, '2025-04-17 22:07:23'),
(30, 0, '2025-04-24 18:06:07'),
(33, 0, '2025-05-04 08:39:18'),
(34, 0, '2025-05-04 08:39:41'),
(35, 0, '2025-05-04 08:39:58'),
(36, 0, '2025-05-04 08:40:18'),
(37, 0, '2025-05-11 17:07:04');

-- --------------------------------------------------------

--
-- Table structure for table `resources`
--

CREATE TABLE `resources` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `value` varchar(100) NOT NULL,
  `action_type` enum('mining','salvage','haul') NOT NULL,
  `emoji` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `resources`
--

INSERT INTO `resources` (`id`, `name`, `value`, `action_type`, `emoji`, `created_at`) VALUES
(34, 'Saldynium', 'saldynium', 'mining', NULL, '2025-04-03 00:36:53'),
(8, 'Recycled Material Composite', 'rmc', 'salvage', NULL, '2025-02-28 06:32:36'),
(9, 'Construction Materials', 'cm', 'salvage', NULL, '2025-02-28 06:32:36'),
(10, 'Scrap Metal', 'scrap_metal', 'salvage', NULL, '2025-02-28 06:32:36'),
(11, 'Ship Parts', 'ship_parts', 'salvage', NULL, '2025-02-28 06:32:36'),
(53, 'Contracted Cargo', 'haul_contract_cargo', 'haul', NULL, '2025-05-04 08:46:01'),
(54, 'ATLS IKTI Power Suit', 'atls_mech_weaponized', 'salvage', NULL, '2025-05-11 17:06:37'),
(28, 'Fuses', 'fuse', 'salvage', NULL, '2025-03-01 10:56:47'),
(30, 'Detatrine', 'detatrine', 'haul', NULL, '2025-03-01 11:01:48'),
(31, 'Caranite', 'caranite', 'mining', NULL, '2025-04-03 00:34:26'),
(32, 'Jaclium', 'jaclium', 'mining', NULL, '2025-04-03 00:34:44'),
(33, 'Quantanium', 'quantanium', 'mining', NULL, '2025-04-03 00:35:03'),
(35, 'Tundra Kopion Horns', 'tundra_kopion_horns', 'haul', NULL, '2025-04-03 00:37:17'),
(38, 'PAF Alignment Blades', 'paf_align_blades', 'salvage', NULL, '2025-04-03 10:53:55'),
(39, 'OLP Laser Activation Codes', 'olp_laser_launch_code', 'salvage', NULL, '2025-04-03 10:54:25'),
(40, 'United Earth Credits', 'uec_credit', 'haul', NULL, '2025-04-03 10:56:14'),
(41, 'VOLT Parallax Assault Rifle', 'unlimited_power_rifle', 'salvage', NULL, '2025-04-06 12:40:24'),
(42, 'P8-AR Battle Rifle', 'p8_ar_battle_rifle', 'salvage', NULL, '2025-04-06 12:40:56'),
(43, 'A03 Sniper Rifle', 'a03_sniper_rifle', 'salvage', NULL, '2025-04-06 12:41:32'),
(44, 'P6-LR Sniper Rifle', 'p6_lr_sniper_rifle', 'salvage', NULL, '2025-04-06 12:42:10'),
(45, 'Mercenary Guild Scrips', 'mg_scrip', 'haul', NULL, '2025-04-24 18:05:40'),
(46, 'VOLT Quartz SMG', 'volt_quartz_smg', 'salvage', NULL, '2025-05-04 08:27:22'),
(47, 'Military Grade Size 1 Components', 'mil_grade_s1_ship_comp', 'salvage', NULL, '2025-05-04 08:29:11'),
(48, 'Military Grade Size 2 Components', 'mil_grade_s2_ship_comp', 'salvage', NULL, '2025-05-04 08:29:35'),
(49, 'Military Grade Size 3 Components', 'mil_grade_s3_ship_comp', 'salvage', NULL, '2025-05-04 08:30:11'),
(50, 'Stealth Size 1 Components', 'stealth_s1_ship_comp', 'salvage', NULL, '2025-05-04 08:30:43'),
(51, 'Stealth Size 2 Components', 'stealth_s2_ship_comp', 'salvage', NULL, '2025-05-04 08:31:08');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` json NOT NULL,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `last_updated`) VALUES
(1, 'autoReport', '{\"time\": \"23:59\", \"enabled\": false, \"guildId\": \"1260629720270245908\", \"channelId\": \"1341396088263020594\", \"lastReportDate\": null}', '2025-04-03 00:33:52');

-- --------------------------------------------------------

--
-- Table structure for table `targets`
--

CREATE TABLE `targets` (
  `id` int NOT NULL,
  `action` varchar(20) NOT NULL,
  `resource` varchar(100) NOT NULL,
  `target_amount` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `targets`
--

INSERT INTO `targets` (`id`, `action`, `resource`, `target_amount`, `created_at`, `created_by`) VALUES
(15, 'salvage', 'fuse', 100, '2025-04-03 00:43:46', '253598351193407489'),
(7, 'salvage', 'rmc', 600, '2025-03-01 10:59:25', '253598351193407489'),
(8, 'salvage', 'cm', 1200, '2025-03-01 10:59:41', '253598351193407489'),
(32, 'salvage', 'mil_grade_s2_ship_comp', 20, '2025-05-04 08:39:02', '253598351193407489'),
(31, 'salvage', 'mil_grade_s1_ship_comp', 30, '2025-05-04 08:38:44', '253598351193407489'),
(18, 'mine', 'caranite', 60, '2025-04-03 00:45:03', '253598351193407489'),
(19, 'mine', 'jaclium', 80, '2025-04-03 00:45:31', '253598351193407489'),
(20, 'mine', 'saldynium', 50, '2025-04-03 00:45:54', '253598351193407489'),
(21, 'mine', 'quantanium', 2400, '2025-04-03 00:46:46', '253598351193407489'),
(22, 'haul', 'tundra_kopion_horns', 200, '2025-04-03 00:47:14', '253598351193407489'),
(23, 'salvage', 'paf_align_blades', 9, '2025-04-03 10:54:51', '253598351193407489'),
(24, 'salvage', 'olp_laser_launch_code', 3, '2025-04-03 10:55:15', '253598351193407489'),
(25, 'haul', 'uec_credit', 40000000, '2025-04-03 10:56:45', '253598351193407489'),
(26, 'salvage', 'a03_sniper_rifle', 10, '2025-04-06 12:42:41', '253598351193407489'),
(27, 'salvage', 'p6_lr_sniper_rifle', 20, '2025-04-06 12:43:05', '253598351193407489'),
(28, 'salvage', 'p8_ar_battle_rifle', 60, '2025-04-06 12:43:22', '253598351193407489'),
(29, 'salvage', 'unlimited_power_rifle', 80, '2025-04-06 12:43:44', '253598351193407489'),
(30, 'haul', 'mg_scrip', 2500, '2025-04-24 18:06:07', '253598351193407489'),
(33, 'salvage', 'mil_grade_s3_ship_comp', 20, '2025-05-04 08:39:18', '253598351193407489'),
(34, 'salvage', 'stealth_s1_ship_comp', 20, '2025-05-04 08:39:41', '253598351193407489'),
(35, 'salvage', 'stealth_s2_ship_comp', 20, '2025-05-04 08:39:58', '253598351193407489'),
(36, 'salvage', 'volt_quartz_smg', 25, '2025-05-04 08:40:18', '253598351193407489'),
(37, 'salvage', 'atls_mech_weaponized', 8, '2025-05-11 17:07:04', '253598351193407489');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `contributions`
--
ALTER TABLE `contributions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_target_id` (`target_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_timestamp` (`timestamp`);

--
-- Indexes for table `dashboards`
--
ALTER TABLE `dashboards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_message_id` (`message_id`),
  ADD KEY `idx_channel_id` (`channel_id`);

--
-- Indexes for table `progress`
--
ALTER TABLE `progress`
  ADD PRIMARY KEY (`target_id`);

--
-- Indexes for table `resources`
--
ALTER TABLE `resources`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `resource_action` (`value`(50),`action_type`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `targets`
--
ALTER TABLE `targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `target_key` (`action`,`resource`(50));

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `contributions`
--
ALTER TABLE `contributions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `dashboards`
--
ALTER TABLE `dashboards`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `resources`
--
ALTER TABLE `resources`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `targets`
--
ALTER TABLE `targets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
