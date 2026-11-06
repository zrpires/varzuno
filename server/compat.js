const tables=['leagues','athletes','matches','match_teams','performances','draws','draw_teams','draw_players'];
export function compat(database){
 function statement(sql,args=[]){let index=0;const text=sql.replace(/\?/g,()=>'$'+(++index)).replace(new RegExp('(?<![\\w.])('+tables.join('|')+')\\b','g'),'varzuno.$1');return {text,params:args,bind(...values){return statement(sql,values);},async first(){return (await database.query(text,args)).rows[0]||null;},async all(){return {results:(await database.query(text,args)).rows};},async run(){const r=await database.query(text,args);return {meta:{changes:r.rowCount}};}};}
 return {prepare:statement,async batch(statements){return (await database.transaction(statements.map(s=>({text:s.text,params:s.params})))).map(r=>({results:r.rows,meta:{changes:r.rowCount}}));}};
}
