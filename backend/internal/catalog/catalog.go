// Package catalog 描述温室里两路数据源与前端展示之间的映射关系。
//
// 新普惠（HTTP，厂商云平台）对应室内数采箱 16139504 和室外气象站 16139453；
// 华创科技（MQTT，直连控制器 HO-SMART-A32）对应控制器上挂接的 5 个传感器。
package catalog

const (
	VendorXinpuhui  = "xinpuhui"
	VendorHuachuang = "huachuang"
)

// Device 是前端传感器页展示用的逻辑设备。
type Device struct {
	ID           string
	Vendor       string
	Name         string
	Category     string
	Type         string
	Model        string
	Manufacturer string
	Zone         string
	Connection   string
}

// Channel 描述新普惠云平台的一个数据通道（e1..e20）。
type Channel struct {
	PhysicalID string
	Key        string
	DeviceID   string
	Metric     string
	Label      string
	Unit       string
	Prec       float64
}

// MQTTMetric 描述华创控制器里某个 T 码的含义。
type MQTTMetric struct {
	Code   int
	Metric string
	Label  string
	Unit   string
}

// MQTTSensor 描述华创控制器上一个按地址（AD）区分的传感器。
type MQTTSensor struct {
	DeviceID string
	AD       int
	Metrics  []MQTTMetric
}

// Devices 是当前实际接入的逻辑设备清单（两路来源）。
var Devices = []Device{
	// 新普惠 · 厂商云平台 HTTP
	{ID: "indoor-air", Vendor: VendorXinpuhui, Name: "空气温湿度传感器", Category: "air", Type: "temperatureHumidity", Model: "数采箱 16139504", Manufacturer: "新普惠", Zone: "温室内", Connection: "4G"},
	{ID: "indoor-co2", Vendor: VendorXinpuhui, Name: "二氧化碳传感器", Category: "co2", Type: "co2", Model: "数采箱 16139504", Manufacturer: "新普惠", Zone: "温室内", Connection: "4G"},
	{ID: "indoor-light", Vendor: VendorXinpuhui, Name: "光照传感器", Category: "light", Type: "light", Model: "数采箱 16139504", Manufacturer: "新普惠", Zone: "温室内", Connection: "4G"},
	{ID: "indoor-leaf", Vendor: VendorXinpuhui, Name: "叶面温湿度传感器", Category: "leaf", Type: "leafTemperatureHumidity", Model: "数采箱 16139504", Manufacturer: "新普惠", Zone: "温室内", Connection: "4G"},
	{ID: "indoor-soil", Vendor: VendorXinpuhui, Name: "土壤综合传感器", Category: "soil", Type: "soilMulti", Model: "数采箱 16139504", Manufacturer: "新普惠", Zone: "温室内", Connection: "4G"},
	{ID: "outdoor-weather", Vendor: VendorXinpuhui, Name: "多功能气象站", Category: "weather", Type: "weather", Model: "数采箱 16139453", Manufacturer: "新普惠", Zone: "温室外", Connection: "4G"},

	// 华创科技 · 控制器 MQTT
	{ID: "mqtt-weather", Vendor: VendorHuachuang, Name: "室外气象站", Category: "weather", Type: "weather", Model: "HO-SMART-A32", Manufacturer: "华创科技", Zone: "室外", Connection: "MQTT"},
	{ID: "mqtt-zone1-multi", Vendor: VendorHuachuang, Name: "多要素传感器", Category: "air", Type: "multi", Model: "HO-SMART-A32", Manufacturer: "华创科技", Zone: "区域1", Connection: "MQTT"},
	{ID: "mqtt-zone1-co2", Vendor: VendorHuachuang, Name: "电子式温湿度计", Category: "co2", Type: "co2", Model: "HO-SMART-A32", Manufacturer: "华创科技", Zone: "区域1", Connection: "MQTT"},
	{ID: "mqtt-zone2-multi", Vendor: VendorHuachuang, Name: "多要素传感器2", Category: "air", Type: "multi", Model: "HO-SMART-A32", Manufacturer: "华创科技", Zone: "区域2", Connection: "MQTT"},
	{ID: "mqtt-zone2-co2", Vendor: VendorHuachuang, Name: "电子式温湿度计2", Category: "co2", Type: "co2", Model: "HO-SMART-A32", Manufacturer: "华创科技", Zone: "区域2", Connection: "MQTT"},
}

// Channels 是新普惠室内、室外两台设备的通道定义，prec 为历史接口原码的换算系数。
var Channels = []Channel{
	{PhysicalID: "16139504", Key: "e1", DeviceID: "indoor-air", Metric: "temperature_1", Label: "温度1", Unit: "℃", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e2", DeviceID: "indoor-air", Metric: "humidity_1", Label: "湿度1", Unit: "%RH", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e3", DeviceID: "indoor-light", Metric: "light_1", Label: "照度1", Unit: "Lux", Prec: 10},
	{PhysicalID: "16139504", Key: "e4", DeviceID: "indoor-co2", Metric: "co2_1", Label: "二氧化碳1", Unit: "PPM", Prec: 1},
	{PhysicalID: "16139504", Key: "e5", DeviceID: "indoor-air", Metric: "temperature_2", Label: "温度2", Unit: "℃", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e6", DeviceID: "indoor-air", Metric: "humidity_2", Label: "湿度2", Unit: "%RH", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e7", DeviceID: "indoor-light", Metric: "light_2", Label: "照度2", Unit: "Lux", Prec: 10},
	{PhysicalID: "16139504", Key: "e8", DeviceID: "indoor-co2", Metric: "co2_2", Label: "二氧化碳2", Unit: "PPM", Prec: 1},
	{PhysicalID: "16139504", Key: "e9", DeviceID: "indoor-leaf", Metric: "leaf_temperature_1", Label: "叶温1", Unit: "℃", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e10", DeviceID: "indoor-leaf", Metric: "leaf_humidity_1", Label: "叶湿1", Unit: "%RH", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e11", DeviceID: "indoor-leaf", Metric: "leaf_temperature_2", Label: "叶温2", Unit: "℃", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e12", DeviceID: "indoor-leaf", Metric: "leaf_humidity_2", Label: "叶湿2", Unit: "%RH", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e13", DeviceID: "indoor-soil", Metric: "soil_temperature_1", Label: "土温1", Unit: "℃", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e14", DeviceID: "indoor-soil", Metric: "soil_moisture_1", Label: "土湿1", Unit: "%", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e15", DeviceID: "indoor-soil", Metric: "ec_1", Label: "电导率1", Unit: "μS/cm", Prec: 1},
	{PhysicalID: "16139504", Key: "e16", DeviceID: "indoor-soil", Metric: "salinity_1", Label: "盐分1", Unit: "mg/L", Prec: 1},
	{PhysicalID: "16139504", Key: "e17", DeviceID: "indoor-soil", Metric: "soil_temperature_2", Label: "土温2", Unit: "℃", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e18", DeviceID: "indoor-soil", Metric: "soil_moisture_2", Label: "土湿2", Unit: "%", Prec: 0.1},
	{PhysicalID: "16139504", Key: "e19", DeviceID: "indoor-soil", Metric: "ec_2", Label: "电导率2", Unit: "μS/cm", Prec: 1},
	{PhysicalID: "16139504", Key: "e20", DeviceID: "indoor-soil", Metric: "salinity_2", Label: "盐分2", Unit: "mg/L", Prec: 1},

	{PhysicalID: "16139453", Key: "e1", DeviceID: "outdoor-weather", Metric: "wind_speed", Label: "风速", Unit: "m/s", Prec: 0.1},
	{PhysicalID: "16139453", Key: "e2", DeviceID: "outdoor-weather", Metric: "rainfall", Label: "雨量累计", Unit: "mm", Prec: 0.1},
	{PhysicalID: "16139453", Key: "e3", DeviceID: "outdoor-weather", Metric: "temperature", Label: "大气温度", Unit: "℃", Prec: 0.1},
	{PhysicalID: "16139453", Key: "e5", DeviceID: "outdoor-weather", Metric: "pressure", Label: "数字气压", Unit: "hPa", Prec: 0.1},
	{PhysicalID: "16139453", Key: "e7", DeviceID: "outdoor-weather", Metric: "wind_direction", Label: "风向", Unit: "°", Prec: 1},
	{PhysicalID: "16139453", Key: "e9", DeviceID: "outdoor-weather", Metric: "humidity", Label: "大气湿度", Unit: "%RH", Prec: 0.1},
	{PhysicalID: "16139453", Key: "e11", DeviceID: "outdoor-weather", Metric: "light", Label: "照度", Unit: "Lux", Prec: 10},
}

// MQTTSensors 是华创控制器上按地址区分的传感器及其 T 码含义。
var MQTTSensors = []MQTTSensor{
	{DeviceID: "mqtt-weather", AD: 99, Metrics: []MQTTMetric{
		{Code: 1, Metric: "temperature", Label: "室外温度", Unit: "℃"},
		{Code: 2, Metric: "humidity", Label: "室外湿度", Unit: "%"},
		{Code: 3, Metric: "light", Label: "光照", Unit: "klux"},
		{Code: 4, Metric: "wind_speed", Label: "风速", Unit: "m/s"},
		{Code: 5, Metric: "rain", Label: "降雨", Unit: ""},
		{Code: 6, Metric: "wind_direction", Label: "风向", Unit: "°"},
	}},
	{DeviceID: "mqtt-zone1-multi", AD: 1, Metrics: []MQTTMetric{
		{Code: 24, Metric: "air_temperature", Label: "空气温度", Unit: "℃"},
		{Code: 25, Metric: "humidity", Label: "相对湿度", Unit: "%"},
		{Code: 26, Metric: "light", Label: "光照强度", Unit: "klux"},
		{Code: 11, Metric: "soil_temperature", Label: "土壤温度", Unit: "℃"},
		{Code: 12, Metric: "soil_moisture", Label: "土壤湿度", Unit: "%"},
	}},
	{DeviceID: "mqtt-zone1-co2", AD: 31, Metrics: []MQTTMetric{
		{Code: 17, Metric: "co2", Label: "CO₂浓度", Unit: "ppm"},
	}},
	{DeviceID: "mqtt-zone2-multi", AD: 121, Metrics: []MQTTMetric{
		{Code: 24, Metric: "air_temperature", Label: "空气温度", Unit: "℃"},
		{Code: 25, Metric: "humidity", Label: "相对湿度", Unit: "%"},
		{Code: 26, Metric: "light", Label: "光照强度", Unit: "klux"},
		{Code: 11, Metric: "soil_temperature", Label: "土壤温度", Unit: "℃"},
		{Code: 12, Metric: "soil_moisture", Label: "土壤湿度", Unit: "%"},
	}},
	{DeviceID: "mqtt-zone2-co2", AD: 151, Metrics: []MQTTMetric{
		{Code: 17, Metric: "co2", Label: "CO₂浓度", Unit: "ppm"},
	}},
}

var channelIndex = func() map[string]Channel {
	index := make(map[string]Channel, len(Channels))
	for _, ch := range Channels {
		index[ch.PhysicalID+":"+ch.Key] = ch
	}
	return index
}()

var deviceIndex = func() map[string]Device {
	index := make(map[string]Device, len(Devices))
	for _, device := range Devices {
		index[device.ID] = device
	}
	return index
}()

var mqttSensorIndex = func() map[int]MQTTSensor {
	index := make(map[int]MQTTSensor, len(MQTTSensors))
	for _, sensor := range MQTTSensors {
		index[sensor.AD] = sensor
	}
	return index
}()

// ChannelByPhysical 按物理设备 ID 和通道键（如 e1）查找通道定义。
func ChannelByPhysical(physicalID, key string) (Channel, bool) {
	ch, ok := channelIndex[physicalID+":"+key]
	return ch, ok
}

// DeviceByID 按逻辑设备 ID 查找设备定义。
func DeviceByID(id string) (Device, bool) {
	device, ok := deviceIndex[id]
	return device, ok
}

// MQTTSensorByAD 按地址（AD）查找华创控制器的传感器定义。
func MQTTSensorByAD(ad int) (MQTTSensor, bool) {
	sensor, ok := mqttSensorIndex[ad]
	return sensor, ok
}

// PhysicalIDs 返回新普惠平台需要采集的物理设备 ID。
func PhysicalIDs() []string {
	return []string{"16139504", "16139453"}
}
