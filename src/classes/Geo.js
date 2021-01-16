/**
 * LibertyPie (https://libertypie.com)
 * @author LibertyPie <hello@libertypie.com>
 * @license MIT
 */

import Cache from './Cache'
import Status from './Status';
import Logger from './Logger';
import Http from './Http';

export default class Geo {

    /**
     * getCountry
     */
    static async getCountry(){

        try{

             //lets start with cloudflare strategy
            let fetchCloudflareStatus = await this.getCountryByCloudflare()

            if(fetchCloudflareStatus.isSuccess()) return fetchCloudflareStatus;
            
            //lets try another strategy
            let ipdbStrategyStatus = await this.httpJsonStrategy({
                    "url": "https://ipinfo.io/json",
                    "countryCodeKey": "country",
                    "ipKey": "ip"
            });

            if(ipdbStrategyStatus.isSuccess()) return ipdbStrategyStatus;
            

            let ipApiStrategy = await this.httpJsonStrategy({
                "url": "http://ip-api.com/json",
                "countryCodeKey": "countryCode",
                "ipKey": "query"
            });

            if(ipApiStrategy.isSuccess()) return ipApiStrategy


            return Status.errorPromise("country_detect_failed")
        } catch (e){
            Logger.error("getCountry Error:",e)
            return Status.errorPromise("country_detect_failed")
        }
    }

    /**
     * cloudflareStrategy
     */
    static async getCountryByCloudflare(){
        try {

            let requestStatus = await  HTTP.get("https://www.cloudflare.com/cdn-cgi/trace")

            if(requestStatus.isError()){
                return requestStatus;
            }

            let responseObj = requestStatus.getData();

            let responseBody = (await responseObj.text()).trim();

            if(responseBody.length == 0){
                return Status.errorPromise("empty_data")
            }

            let splitDataByLine = responseBody.split(/\r?\n/)

            let processedData = {}

            for(let index in splitDataByLine){
                
                let line = splitDataByLine[index].trim()
                
                if(!(line.startsWith("ip")|| line.startsWith("loc"))) continue;

                //lets split the key with value
                let lineDataSplit = line.split("=")

                processedData[lineDataSplit[0].toLowerCase()] = lineDataSplit[1].toLowerCase()
            } //end for loop
            
            processedData["countryCode"] = processedData["loc"]

            return Status.successPromise(null, processedData);
        } catch (e) {
            Logger.error(e,e.stack)
            return Status.errorPromise(e,e)
        }
    }


    /**
     * ipdb strategy
     */
    static async httpJsonStrategy({
        url,
        countryCodeKey,
        ipKey
    }){
        try{

            let reqStatus = await Http.getJson(url)
            
            if(reqStatus.isError()) return reqStatus

            let respJson = reqStatus.getData()


            let ip = respJson[ipKey] || null
            let countryCode = respJson[countryCodeKey] || null

            if(ip == null || countryCode == null){
                return Status.errorPromise("empty_data")
            }

            return Status.successPromise(null, {
                ip,
                countryCode
            })
        } catch (e){
            Logger.error("ipdbStrategy Error:", e)
            return Status.errorPromise("request_failed",e)
        }
    } //end fun

} // end class
    