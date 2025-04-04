/**
 * Internal dependencies
 */
import { type ModuleLoad } from './loader';

async function doFetch( url: string, fetchOpts: RequestInit, parent: string ) {
	let res: Response;

	try {
		res = await fetch( url, fetchOpts );
	} catch ( e ) {
		e.message =
			`Unable to fetch ${ url }${ fromParent(
				parent
			) } - see network log for details.\n` + e.message;
		throw e;
	}
	if ( ! res?.ok ) {
		throw Error(
			`${ res.status } ${ res.statusText } ${ res.url }${ fromParent(
				parent
			) }`
		);
	}
	return res;
}

function fromParent( parent ) {
	return parent ? ` imported from ${ parent }` : '';
}

const jsContentType = /^(text|application)\/(x-)?javascript(;|$)/;

/**
 * Fetch the passed module URL and return the corresponding `ModuleLoad`
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
	const res = await doFetch( url, fetchOpts, parent );
	const contentType = res.headers.get( 'content-type' );
	if ( jsContentType.test( contentType ) ) {
		return { r: res.url, s: await res.text(), t: 'js' };
	}
	throw Error(
		`Unsupported Content-Type "${ contentType }" loading ${ url }${ fromParent(
			parent
		) }. Modules must be served with a valid MIME type like application/javascript.`
	);
}
