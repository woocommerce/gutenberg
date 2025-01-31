// restrict in-flight fetches to a pool of 100
const p = [];
let c = 0;
function pushFetchPool() {
	if ( ++c > 100 ) {
		return new Promise( ( r ) => p.push( r ) );
	}
	return undefined;
}
function popFetchPool() {
	c--;
	if ( p.length ) {
		p.shift()();
	}
}

async function doFetch( url, fetchOpts, parent ) {
	const poolQueue = pushFetchPool();
	if ( poolQueue ) {
		await poolQueue;
	}
	let res: Response;

	try {
		res = await fetch( url, fetchOpts );
	} catch ( e ) {
		e.message =
			`Unable to fetch ${ url }${ fromParent(
				parent
			) } - see network log for details.\n` + e.message;
		throw e;
	} finally {
		popFetchPool();
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

export async function fetchModule( url, fetchOpts, parent ) {
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
