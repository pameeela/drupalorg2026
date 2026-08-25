<?php

$settings['cache']['bins']['render'] = 'cache.backend.null';
$settings['cache']['bins']['page'] = 'cache.backend.null';
$settings['cache']['bins']['dynamic_page_cache'] = 'cache.backend.null';

// Use development service parameters.
$settings['container_yamls'][] = $app_root . '/' . $site_path . '/services.local.yml';
