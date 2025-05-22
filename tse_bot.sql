-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: May 22, 2025 at 12:58 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

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
-- Table structure for table `action_types`
--

CREATE TABLE `action_types` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `unit` varchar(50) NOT NULL DEFAULT 'SCU',
  `emoji` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `action_types`
--

INSERT INTO `action_types` (`id`, `name`, `display_name`, `unit`, `emoji`, `created_at`) VALUES
(1, 'mining', 'Mining', 'SCU', '⛏️', '2025-05-21 13:29:28'),
(2, 'salvage', 'Salvage', 'SCU', '🏭', '2025-05-21 13:29:28'),
(3, 'haul', 'Hauling', 'SCU', '🚚', '2025-05-21 13:29:28'),
(4, 'earn', 'Earning', 'aUEC', '💰', '2025-05-21 13:29:28'),
(5, 'mine', 'Mine', 'SCU', NULL, '2025-05-21 13:29:28');

-- --------------------------------------------------------

--
-- Table structure for table `contributions`
--

CREATE TABLE `contributions` (
  `id` int(11) NOT NULL,
  `target_id` int(11) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `amount` int(11) NOT NULL,
  `location` varchar(255) NOT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `id` int(11) NOT NULL,
  `message_id` varchar(100) NOT NULL,
  `channel_id` varchar(100) NOT NULL,
  `guild_id` varchar(100) NOT NULL,
  `source_guild_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `progress`
--

CREATE TABLE `progress` (
  `target_id` int(11) NOT NULL,
  `current_amount` int(11) NOT NULL DEFAULT 0,
  `last_updated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `id` int(11) NOT NULL,
  `guild_id` varchar(100) NOT NULL DEFAULT '1096701753329721425',
  `name` varchar(255) NOT NULL,
  `value` varchar(100) NOT NULL,
  `action_type` enum('mining','salvage','haul') NOT NULL,
  `emoji` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `action_type_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `resources`
--

INSERT INTO `resources` (`id`, `guild_id`, `name`, `value`, `action_type`, `emoji`, `created_at`, `action_type_id`) VALUES
(34, '1260629720270245908', 'Saldynium', 'saldynium', 'mining', NULL, '2025-04-03 00:36:53', 1),
(8, '1260629720270245908', 'Recycled Material Composite', 'rmc', 'salvage', NULL, '2025-02-28 06:32:36', 2),
(9, '1260629720270245908', 'Construction Materials', 'cm', 'salvage', NULL, '2025-02-28 06:32:36', 2),
(10, '1260629720270245908', 'Scrap Metal', 'scrap_metal', 'salvage', NULL, '2025-02-28 06:32:36', 2),
(11, '1260629720270245908', 'Ship Parts', 'ship_parts', 'salvage', NULL, '2025-02-28 06:32:36', 2),
(53, '1260629720270245908', 'Contracted Cargo', 'haul_contract_cargo', 'haul', NULL, '2025-05-04 08:46:01', 3),
(54, '1260629720270245908', 'ATLS IKTI Power Suit', 'atls_mech_weaponized', 'salvage', NULL, '2025-05-11 17:06:37', 2),
(28, '1260629720270245908', 'Fuses', 'fuse', 'salvage', NULL, '2025-03-01 10:56:47', 2),
(30, '1260629720270245908', 'Detatrine', 'detatrine', 'haul', NULL, '2025-03-01 11:01:48', 3),
(31, '1260629720270245908', 'Caranite', 'caranite', 'mining', NULL, '2025-04-03 00:34:26', 1),
(32, '1260629720270245908', 'Jaclium', 'jaclium', 'mining', NULL, '2025-04-03 00:34:44', 1),
(33, '1260629720270245908', 'Quantanium', 'quantanium', 'mining', NULL, '2025-04-03 00:35:03', 1),
(35, '1260629720270245908', 'Tundra Kopion Horns', 'tundra_kopion_horns', 'haul', NULL, '2025-04-03 00:37:17', 3),
(38, '1260629720270245908', 'PAF Alignment Blades', 'paf_align_blades', 'salvage', NULL, '2025-04-03 10:53:55', 2),
(39, '1260629720270245908', 'OLP Laser Activation Codes', 'olp_laser_launch_code', 'salvage', NULL, '2025-04-03 10:54:25', 2),
(40, '1260629720270245908', 'United Earth Credits', 'uec_credit', 'haul', NULL, '2025-04-03 10:56:14', 3),
(41, '1260629720270245908', 'VOLT Parallax Assault Rifle', 'unlimited_power_rifle', 'salvage', NULL, '2025-04-06 12:40:24', 2),
(42, '1260629720270245908', 'P8-AR Battle Rifle', 'p8_ar_battle_rifle', 'salvage', NULL, '2025-04-06 12:40:56', 2),
(43, '1260629720270245908', 'A03 Sniper Rifle', 'a03_sniper_rifle', 'salvage', NULL, '2025-04-06 12:41:32', 2),
(44, '1260629720270245908', 'P6-LR Sniper Rifle', 'p6_lr_sniper_rifle', 'salvage', NULL, '2025-04-06 12:42:10', 2),
(45, '1260629720270245908', 'Mercenary Guild Scrips', 'mg_scrip', 'haul', NULL, '2025-04-24 18:05:40', 3),
(46, '1260629720270245908', 'VOLT Quartz SMG', 'volt_quartz_smg', 'salvage', NULL, '2025-05-04 08:27:22', 2),
(47, '1260629720270245908', 'Military Grade Size 1 Components', 'mil_grade_s1_ship_comp', 'salvage', NULL, '2025-05-04 08:29:11', 2),
(48, '1260629720270245908', 'Military Grade Size 2 Components', 'mil_grade_s2_ship_comp', 'salvage', NULL, '2025-05-04 08:29:35', 2),
(49, '1260629720270245908', 'Military Grade Size 3 Components', 'mil_grade_s3_ship_comp', 'salvage', NULL, '2025-05-04 08:30:11', 2),
(50, '1260629720270245908', 'Stealth Size 1 Components', 'stealth_s1_ship_comp', 'salvage', NULL, '2025-05-04 08:30:43', 2),
(51, '1260629720270245908', 'Stealth Size 2 Components', 'stealth_s2_ship_comp', 'salvage', NULL, '2025-05-04 08:31:08', 2);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `guild_id` varchar(100) NOT NULL DEFAULT '1096701753329721425',
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`setting_value`)),
  `last_updated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `guild_id`, `setting_key`, `setting_value`, `last_updated`) VALUES
(1, '1260629720270245908', 'autoReport', '{\"time\": \"23:59\", \"enabled\": false, \"guildId\": \"1260629720270245908\", \"channelId\": \"1341396088263020594\", \"lastReportDate\": null}', '2025-05-22 10:54:43');

-- --------------------------------------------------------

--
-- Table structure for table `targets`
--

CREATE TABLE `targets` (
  `id` int(11) NOT NULL,
  `guild_id` varchar(100) NOT NULL DEFAULT '1096701753329721425',
  `action` varchar(20) NOT NULL,
  `resource` varchar(100) NOT NULL,
  `target_amount` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `targets`
--

INSERT INTO `targets` (`id`, `guild_id`, `action`, `resource`, `target_amount`, `created_at`, `created_by`) VALUES
(15, '1260629720270245908', 'salvage', 'fuse', 100, '2025-04-03 00:43:46', '253598351193407489'),
(7, '1260629720270245908', 'salvage', 'rmc', 600, '2025-03-01 10:59:25', '253598351193407489'),
(8, '1260629720270245908', 'salvage', 'cm', 1200, '2025-03-01 10:59:41', '253598351193407489'),
(32, '1260629720270245908', 'salvage', 'mil_grade_s2_ship_comp', 20, '2025-05-04 08:39:02', '253598351193407489'),
(31, '1260629720270245908', 'salvage', 'mil_grade_s1_ship_comp', 30, '2025-05-04 08:38:44', '253598351193407489'),
(18, '1260629720270245908', 'mine', 'caranite', 60, '2025-04-03 00:45:03', '253598351193407489'),
(19, '1260629720270245908', 'mine', 'jaclium', 80, '2025-04-03 00:45:31', '253598351193407489'),
(20, '1260629720270245908', 'mine', 'saldynium', 50, '2025-04-03 00:45:54', '253598351193407489'),
(21, '1260629720270245908', 'mine', 'quantanium', 2400, '2025-04-03 00:46:46', '253598351193407489'),
(22, '1260629720270245908', 'haul', 'tundra_kopion_horns', 200, '2025-04-03 00:47:14', '253598351193407489'),
(23, '1260629720270245908', 'salvage', 'paf_align_blades', 9, '2025-04-03 10:54:51', '253598351193407489'),
(24, '1260629720270245908', 'salvage', 'olp_laser_launch_code', 3, '2025-04-03 10:55:15', '253598351193407489'),
(25, '1260629720270245908', 'haul', 'uec_credit', 40000000, '2025-04-03 10:56:45', '253598351193407489'),
(26, '1260629720270245908', 'salvage', 'a03_sniper_rifle', 10, '2025-04-06 12:42:41', '253598351193407489'),
(27, '1260629720270245908', 'salvage', 'p6_lr_sniper_rifle', 20, '2025-04-06 12:43:05', '253598351193407489'),
(28, '1260629720270245908', 'salvage', 'p8_ar_battle_rifle', 60, '2025-04-06 12:43:22', '253598351193407489'),
(29, '1260629720270245908', 'salvage', 'unlimited_power_rifle', 80, '2025-04-06 12:43:44', '253598351193407489'),
(30, '1260629720270245908', 'haul', 'mg_scrip', 2500, '2025-04-24 18:06:07', '253598351193407489'),
(33, '1260629720270245908', 'salvage', 'mil_grade_s3_ship_comp', 20, '2025-05-04 08:39:18', '253598351193407489'),
(34, '1260629720270245908', 'salvage', 'stealth_s1_ship_comp', 20, '2025-05-04 08:39:41', '253598351193407489'),
(35, '1260629720270245908', 'salvage', 'stealth_s2_ship_comp', 20, '2025-05-04 08:39:58', '253598351193407489'),
(36, '1260629720270245908', 'salvage', 'volt_quartz_smg', 25, '2025-05-04 08:40:18', '253598351193407489'),
(37, '1260629720270245908', 'salvage', 'atls_mech_weaponized', 8, '2025-05-11 17:07:04', '253598351193407489');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `action_types`
--
ALTER TABLE `action_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_action_name` (`name`);

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
  ADD UNIQUE KEY `resource_action` (`value`(50),`action_type`),
  ADD KEY `idx_guild_id` (`guild_id`),
  ADD KEY `idx_action_type_id` (`action_type_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_guild_key` (`setting_key`,`guild_id`);

--
-- Indexes for table `targets`
--
ALTER TABLE `targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `target_key` (`action`,`resource`(50)),
  ADD KEY `idx_guild_id` (`guild_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `action_types`
--
ALTER TABLE `action_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `contributions`
--
ALTER TABLE `contributions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `dashboards`
--
ALTER TABLE `dashboards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `resources`
--
ALTER TABLE `resources`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `targets`
--
ALTER TABLE `targets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
