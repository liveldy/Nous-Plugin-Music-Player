package org.example.text;
import android.content.Context;import org.json.JSONObject;import java.util.function.BiFunction;
/** MIT. Public Android entry ABI, no application-internal imports. */
public final class AndroidPlugin {
 public void initialize(Context context,BiFunction<String,JSONObject,Object> host){}
 public Object execute(String method,JSONObject params)throws Exception{return TextService.execute(method,params);}
 public void close(){}
}
