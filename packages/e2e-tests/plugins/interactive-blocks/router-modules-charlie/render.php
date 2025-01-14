<?php
/**
 * HTML for testing the iAPI's script module assets management.
 *
 * @package gutenberg-test-interactive-blocks
 *
 * @phpcs:disable VariableAnalysis.CodeAnalysis.VariableAnalysis.UndefinedVariable
 */

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'data-testid'         => 'charlie-block',
		'data-wp-interactive' => 'test/router-modules-charlie',
		'data-wp-text'        => 'state.name',
	)
);
?>
<p <?php echo $wrapper_attributes; ?>></p>
