'use strict';

module.exports = compile;

var generators = {
    "NUMBER": function( node ) {
        return node.arguments[ 0 ];
    },
    "STRING": function( node ) {
        return '"' + node.arguments[ 0 ].replace( '"', '\\"' ) + '"';
    },
    "SYMBOL": function( node ) {
        return '"' + node.arguments[ 0 ] + '"';
    },
    
    "-": function( node ) {
        return -node.arguments[ 0 ];
    },
    "&&": function( node ) {
        var result = [];
        node.arguments.forEach( function( _node ) {
           result.push( _processNode( _node ) );
        } );
        return ' { "bool": { "must": [ ' + result.join( ',\n' ) + ' ] } }\n';
    },
    "||": function( node ) {
        var result = [];
        node.arguments.forEach( function( _node ) {
            result.push( _processNode( _node ) );
        } );
        return ' { "bool": { "should": [ ' + result.join( ',\n' ) + ' ] } }\n'; 
    },
    "IN": function( node ) {
        var value = _processNode( node.arguments[ 0 ] );
        var field = _processNode( node.arguments[ 1 ] );
        return ' ' + field + ': { "$in": [ ' + value + ' ] }\n';
    },
    "!": function( node ) {
        return ' { "bool": { "must_not": [ ' + _processNode( node.arguments[ 0 ] ) + ' ] } }\n'; 
    },
    "==": function( node ) {
        var comparison = _extractComparison( node );
        return ' { "term": { ' + _processNode( comparison.symbol ) + ': ' + _processNode( comparison.value ) + ' } }\n';
    },
    "!=": function( node ) {
        var comparison = _extractComparison( node );
        return ' { "bool": { "must_not": { "term": { ' + _processNode( comparison.symbol ) + ': ' + _processNode( comparison.value ) + ' } } } }\n';
    },
    "MATCH": function( node ) {
        var comparison = _extractComparison( node );
        return ' { "bool": { "must": { "regexp": { ' + _processNode( comparison.symbol ) + ': ' + _processNode( comparison.value ) + ' } } } }\n';
    },
    "<": function( node ) {
        var comparison = _extractComparison( node );
        return ' { "range": { ' + _processNode( comparison.symbol ) + ': { "lt": ' + _processNode( comparison.value ) + ' } } }\n';
    },    
    "<=": function( node ) {
        var comparison = _extractComparison( node );
        return ' { "range": { ' + _processNode( comparison.symbol ) + ': { "lte": ' + _processNode( comparison.value ) + ' } } }\n';
    },    
    ">": function( node ) {
        var comparison = _extractComparison( node );
        return ' { "range": { ' + _processNode( comparison.symbol ) + ': { "gt": ' + _processNode( comparison.value ) + ' } } }\n';
    },    
    ">=": function( node ) {
        var comparison = _extractComparison( node );
        return ' { "range": { ' + _processNode( comparison.symbol ) + ': { "gte": ' + _processNode( comparison.value ) + ' } } }\n';
    },
    "EXPRESSION": function( node ) {
        var result = [];
        node.arguments.forEach( function( _node ) {
            result.push( _processNode( _node ) );
        } );
        return ' ' + result.join( ',\n' );        
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
    var json = '{ "query" : { "filtered" : { "filter": [ ' + _processNode( tree ) + ' ] } } }';
    return JSON.parse( json );
}