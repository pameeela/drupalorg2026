<?php

declare(strict_types=1);

namespace Drupal\drupalorg\Hook;

use Drupal\Component\Utility\NestedArray;
use Drupal\Core\Breadcrumb\ChainBreadcrumbBuilderInterface;
use Drupal\Core\Controller\TitleResolverInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Extension\ThemeExtensionList;
use Drupal\Core\Extension\ThemeSettingsProvider;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Messenger\MessengerTrait;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\drupalorg\RenderCallbacks;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\node\NodeInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Contains hook implementations for Drupalorg.
 */
final class ThemeHooks {

  use MessengerTrait;
  use StringTranslationTrait;

  /**
   * The Drupal root.
   */
  private static ?string $appRoot = NULL;

  public function __construct(
    private readonly ThemeSettingsProvider $themeSettings,
    private readonly RequestStack $requestStack,
    private readonly ThemeExtensionList $themeList,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly RouteMatchInterface $routeMatch,
    private readonly TitleResolverInterface $titleResolver,
    private readonly ChainBreadcrumbBuilderInterface $breadcrumb,
    private readonly ModuleHandlerInterface $moduleHandler,
    #[Autowire(param: 'app.root')] string $appRoot,
  ) {
    self::$appRoot ??= $appRoot;
  }

  /**
   * Implements hook_element_info_alter().
   */
  #[Hook('element_info_alter')]
  public function alterElementInfo(array &$info): void {
    $info['component']['#pre_render'][] = [RenderCallbacks::class, 'preRenderComponent'];
  }

  /**
   * Implements template_preprocess_image_widget().
   */
  #[Hook('preprocess_image_widget')]
  public function preprocessImageWidget(array &$variables): void {
    $data = &$variables['data'];

    // This prevents image widget templates from rendering preview container
    // HTML to users that do not have permission to access these previews.
    // @todo revisit in https://drupal.org/node/953034
    // @todo revisit in https://drupal.org/node/3114318
    if (isset($data['preview']['#access']) && $data['preview']['#access'] === FALSE) {
      unset($data['preview']);
    }
  }

  /**
   * Implements template_preprocess_html().
   */
  #[Hook('preprocess_html')]
  public function preprocessHtml(array &$variables): void {
    // Get the theme base path for font preloading.
    $variables['drupalorg_path'] = $this->requestStack->getCurrentRequest()->getBasePath() . '/' . $this->themeList->getPath('drupalorg');
  }

  /**
   * Implements template_preprocess_page().
   */
  #[Hook('preprocess_page')]
  public function preprocessPage(array &$variables): void {
    // @see \Drupal\Core\Block\Plugin\Block\PageTitleBlock::build()
    $variables['title'] = [
      '#type' => 'page_title',
      '#title' => $variables['page']['#title'] ?? $this->titleResolver->getTitle(
        $this->requestStack->getCurrentRequest(),
        $this->routeMatch->getRouteObject(),
      ),
    ];

    // @see \Drupal\system\Plugin\Block\SystemBreadcrumbBlock::build()
    $variables['breadcrumb'] = $this->breadcrumb->build($this->routeMatch)
      ->toRenderable();

    $route_name = $this->routeMatch->getRouteName();
    if ($route_name === 'entity.canvas_page.canonical' || str_starts_with($this->routeMatch->getRouteObject()?->getPath() ?? '', '/canvas/')) {
      $variables['rendered_by_canvas'] = TRUE;
    }
    elseif ($route_name === 'entity.node.canonical' && $this->moduleHandler->moduleExists('canvas')) {
      $node = $this->routeMatch->getParameter('node');
      assert($node instanceof NodeInterface);

      $variables['rendered_by_canvas'] = (bool) $this->entityTypeManager->getStorage('content_template')
        ->getQuery()
        ->accessCheck(FALSE)
        ->count()
        ->condition('content_entity_type_id', 'node')
        ->condition('content_entity_type_bundle', $node->getType())
        ->condition('content_entity_type_view_mode', 'full')
        ->condition('status', TRUE)
        ->execute();
    }
    else {
      $variables['rendered_by_canvas'] = FALSE;
    }
  }

}
