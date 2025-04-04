/**
 * Internal dependencies
 */
import { type ModuleLoad } from './loader';

const fetching = ( url: string, parent?: string ) => {
	return ` fetching ${ url }${ parent ? ` from ${ parent }` : '' }`;
};

const jsContentType = /^(text|application)\/(x-)?javascript(;|$)/;

/**
 * Fetches the passed module URL and return the corresponding `ModuleLoad`
 * instance. If the passed URL does not point to a JS file, the function
 * throws and error.
 *
 * @param url       Module URL.
 * @param fetchOpts Fetch init options.
 * @param parent    Parent module URL referencing this URL (if any).
 * @return Promise with a `ModuleLoad` instance.
 */
export async function fetchModule(
	url: string,
	fetchOpts: RequestInit,
	parent: string
): Promise< ModuleLoad > {
	let res: Response;
	try {
		res = await fetch( url, fetchOpts );
	} catch ( e ) {
		throw Error( `Network error${ fetching( url, parent ) }.` );
	}
	if ( ! res.ok ) {
		throw Error( `Error ${ res.status }${ fetching( url, parent ) }.` );
	}
	const contentType = res.headers.get( 'content-type' );
	if ( ! jsContentType.test( contentType ) ) {
		throw Error(
			`Bad Content-Type "${ contentType }"${ fetching( url, parent ) }.`
		);
	}
	return { r: res.url, s: await res.text(), t: 'js' };
}
