<?php
/**
 * HTML for testing the hydration of router regions.
 *
 * @package gutenberg-test-interactive-blocks
 *
 * @phpcs:disable VariableAnalysis.CodeAnalysis.VariableAnalysis.UndefinedVariable
 */
?>

<section>
	<h2>Region 1</h2>
	<div
		data-wp-interactive="router-regions"
		data-wp-router-region="region-1"
	>
		<p
			data-testid="region-1-text"
			data-wp-text="state.region1.text"
		>not hydrated</p>
		<p
			data-testid="region-1-ssr"
		>content from page <?php echo $attributes['page']; ?></p>

		<button
			data-testid="state-counter"
			data-wp-text="state.counter.value"
			data-wp-on--click="actions.counter.increment"
		>NaN</button>

		<?php if ( isset( $attributes['next'] ) ) : ?>
			<a
				data-testid="next"
				data-wp-on--click="actions.router.navigate"
				href="<?php echo $attributes['next']; ?>"
			>Next</a>
		<?php else : ?>
			<a
				data-testid="back"
				data-wp-on--click="actions.router.back"
				href="#"
			>Back</a>
		<?php endif; ?>
	</div>
</section>

<div>
	<p
		data-testid="no-region-text-1"
		data-wp-text="state.region1.text"
	>not hydrated</p>
</div>

<section>
	<h2>Region 2</h2>
	<div
		data-wp-interactive="router-regions"
		data-wp-router-region="region-2"
	>
		<p
			data-testid="region-2-text"
			data-wp-text="state.region2.text"
		>not hydrated</p>
		<p
			data-testid="region-2-ssr"
		>content from page <?php echo $attributes['page']; ?></p>

		<button
			data-testid="context-counter"
			data-wp-context='{ "counter": { "initialValue": 0 } }'
			data-wp-init="actions.counter.init"
			data-wp-text="context.counter.value"
			data-wp-on--click="actions.counter.increment"
		>NaN</button>

		<div>
			<div>
				<p
					data-testid="no-region-text-2"
					data-wp-text="state.region2.text"
				>not hydrated</p>
			</div>

			<section>
				<h2>Nested region</h2>
				<div
					data-wp-interactive="router-regions"
					data-wp-router-region="nested-region"
				>
					<p data-testid="nested-region-ssr">
						content from page <?php echo $attributes['page']; ?>
					</p>

					<button data-testid="add-item" data-wp-on--click="actions.addItem">
						Add item
					</button>

					<ul>
						<template data-wp-each="state.items">
							<li data-testid="nested-item" data-wp-key="context.item" data-wp-text="context.item"></li>	
						</template>
						<li data-testid="nested-item" data-wp-each-child>item 1</li>
						<li data-testid="nested-item" data-wp-each-child>item 2</li>
						<li data-testid="nested-item" data-wp-each-child>item 3</li>
					</ul>
				</div>
			</section>
		</div>
	</div>
</section>

<div data-wp-interactive="router-regions">
	<div data-wp-router-region="invalid-region-1">
		<p data-testid="invalid-region-text-1">
			content from page <?php echo $attributes['page']; ?>
		</p>
	</div>
	<div data-wp-interactive="router-regions" data-wp-router-region="invalid-region-2">
		<p data-testid="invalid-region-text-2">
			content from page <?php echo $attributes['page']; ?>
		</p>
	</div>
</div>

<div id="regions-with-attach-to" data-testid="regions-with-attach-to">
	<?php
	foreach ( $attributes['regionsWithAttachTo'] ?? array() as $region ) {
		$region_type    = esc_attr( $region['type'] );
		$region_id      = esc_attr( $region['data']['id'] );
		$region_data    = wp_json_encode( $region['data'] );
		$has_directives = isset( $attributes['hasDirectives'] ) ? 'data-wp-init="callback.updateText"' : '';
		$context_data   = wp_interactivity_data_wp_context(
			array(
				'text'    => $region['data']['id'],
				'counter' => array(
					'value'       => $attributes['counter'] ?? 0,
					'serverValue' => $attributes['counter'] ?? 0,
				),
			)
		);

		$html = <<<HTML
		<$region_type
			data-wp-interactive="router-regions"
			data-wp-router-region='$region_data'
			data-testid="$region_id"
			$has_directives
		>
			<div $context_data>
				<h2>Region with <code>attachTo</code></h2>
				<p
					data-testid="text"
					data-wp-text="context.text"
				>not hydrated</p>

				<p> Client value:
					<output
						data-testid="counter-value"
						data-wp-text="context.counter.value"
					>
						NaN
					</output>
				</p>
				<p> Server value:
					<output
						data-testid="counter-server-value"
						data-wp-text="context.counter.serverValue"
						data-wp-watch="actions.counter.updateCounterFromServer"
					>
						NaN
					</output>
				</p>
				<button
					data-testid="counter-button"
					data-wp-on--click="actions.counter.increment"
				>+1</button>
			</div>
		</$region_type>
HTML;

		echo $html;
	}
	?>
</div>