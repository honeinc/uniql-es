'use strict';

var extend = require( 'extend' );

module.exports = compile;

function _identity( node ) {
    return node.arguments[ 0 ];
}

var generators = {
    "NUMBER": function( node ) {
        var value = _identity( node );
        return value.indexOf( '.' ) < 0 ? parseInt( value, 10 ) : parseFloat( value );
    },
    "BOOLEAN": function( node ) {
        var value = _identity( node );
        return value.toLowerCase() === 'true';
    },
    "PRIMITIVE": function( node ) {
        var value = _identity( node );
        switch ( value.toLowerCase() ) {
            case 'null':
                value = null;
                break;
            case 'undefined':
                value = undefined;
                break;
        }
        return value;
    },
    "STRING": _identity,
    "SYMBOL": _identity,
    
    "-": function( node ) {
        return -_identity( node );
    },
    "&&": function( node ) {
        var _and = { bool: { must: [] } };
        node.arguments.forEach( function( _node ) {
           _and.bool.must.push( _processNode( _node ) );
        } );
        return _and;
    },
    "||": function( node ) {
        var _or = { bool: { should: [] } };
        node.arguments.forEach( function( _node ) {
            _or.bool.should.push( _processNode( _node ) );
        } );
        return _or;
    },
    "IN": function( node ) {
        var value = _processNode( node.arguments[ 0 ] );
        var field = _processNode( node.arguments[ 1 ] );
        var _in = {};
        _in[ field ] = {
            $in: [ value ]
        };
    },
    "!": function( node ) {
        return { bool: { must_not: [ _processNode( node.arguments[ 0 ] ) ] } }; 
    },
    "==": function( node ) {
        var comparison = _extractComparison( node );
        var _equals = {
            term: {}
        };
        _equals.term[ _processNode( comparison.symbol ) ] = _processNode( comparison.value );
        return _equals;
    },
    "!=": function( node ) {
        var comparison = _extractComparison( node );
        var _nequals = {
            bool: {
                must_not: {
                    term: {}
                }
            }
        };
        _nequals.bool.must_not.term[ _processNode( comparison.symbol ) ] = _processNode( comparison.value );
        return _nequals;
    },
    "MATCH": function( node ) {
        var comparison = _extractComparison( node );
        var _match = {
            bool: {
                must: {
                    regexp: {}
                }
            }
        };
        _match.bool.must.regexp[ _processNode( comparison.symbol ) ] = _processNode( comparison.value );
        return _match;
    },
    "<": function( node ) {
        var comparison = _extractComparison( node );
        var _lt = {
            range: {}
        };
        _lt.range[ _processNode( comparison.symbol ) ] = {
            lt: _processNode( comparison.value )
        };
        return _lt;
    },    
    "<=": function( node ) {
        var comparison = _extractComparison( node );
        var _lte = {
            range: {}
        };
        _lte.range[ _processNode( comparison.symbol ) ] = {
            lte: _processNode( comparison.value )
        };
        return _lte;
    },    
    ">": function( node ) {
        var comparison = _extractComparison( node );
        var _gt = {
            range: {}
        };
        _gt.range[ _processNode( comparison.symbol ) ] = {
            gt: _processNode( comparison.value )
        };
        return _gt;
    },    
    ">=": function( node ) {
        var comparison = _extractComparison( node );
        var _gte = {
            range: {}
        };
        _gte.range[ _processNode( comparison.symbol ) ] = {
            gte: _processNode( comparison.value )
        };
        return _gte;
    },
    "EXPRESSION": function( node ) {
        var _expression = {};
        node.arguments.forEach( function( _node ) {
            extend( _expression, _processNode( _node ) );
        } );
        return _expression;
    }
};

function _extractComparison( node ) {
    var symbol = null;
    var value = null;
    node.arguments.forEach( function( _node ) {
        if ( _node.type === 'SYMBOL' ) {
            if ( symbol ) {
                throw new Error( 'ELASTICSEARCH: You can only specify one symbol in a comparison.' );
            }
            symbol = _node;
        } else {
            if ( value ) {
                throw new Error( 'ELASTICSEARCH: You can only specify one value in a comparison.' );
            }
            value = _node;
        }
    } );

    if ( !( symbol && value ) ) {
        throw new Error( 'ELASTICSEARCH: Invalid comparison, could not find both symbol and value.' );
    }

    return {
        symbol: symbol,
        value: value
    };
}

function _processNode( node ) {
    if ( !( node.type in generators ) ) {
        throw new Error( 'invalid node type' );
    }
    
    return generators[ node.type ]( node );
}

function compile( tree ) {
    var query = {
        query: {
            filtered: {}
        }
    };
    query.query.filtered.filter = [ _processNode( tree ) ];
    return query;
}